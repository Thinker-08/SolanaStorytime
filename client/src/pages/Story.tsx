import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { usePrompt } from "../context/PromptContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Lottie from 'lottie-react';

// Helper to collapse extra spaces and inject proper markdown breaks
function formatStory(text: string): string {
  return text
    .replace(/ {2,}/g, ' ')                              // collapse multiple spaces
    .replace(/\*\*\s*Title\s*:\s*(.+?)\s*\*\*/g, '\n\n## $1\n\n')
    .replace(/---/g, '\n\n---\n\n')                  // rules
    .replace(/###\s*Summary\s*for\s*Kids\s*:/gi, '\n\n### Summary for Kids:\n\n')
    .replace(/\*\*[\s\S]+For\s*Parents[\s\S]*$/m, match => `\n\n${match.trim()}\n\n`)
    .trim();
}

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

export default function Story() {
  const lottieRef = useRef<any>();
  const [, navigate] = useLocation();
  const { prompt } = usePrompt();
  const { toast } = useToast();
  const { token } = useAuth();
  const [animationData, setAnimationData] = useState<any>(null);

  // Raw streaming content
  const [rawStory, setRawStory] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  const [selectedFeedbackCode, setSelectedFeedbackCode] = useState<number | null>(null);

  const feedbackOptions = [
    { code: 1, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/lywu9ibb3gm2alhvcvzh.png", alt: "Loved it!!" },
    { code: 2, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/fkmkhqoa6xyi80a7cwpk.png", alt: "Felt connected" },
    { code: 3, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/dsxdjj7qoekw5djcpsp1.png", alt: "It was okay" },
    { code: 4, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/chrwsxmqm7k0xk2jhorl.png", alt: "Didn't click" },
    { code: 5, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/tj0ukdvtp01rzyvadq0c.png", alt: "Needs Improvement" },
  ];

  // Load Lottie animation
  useEffect(() => {
    fetch("https://res.cloudinary.com/dnzwzwnlg/raw/upload/v1745941973/bxzvidweal4petm3qlfs.json")
      .then(res => res.json())
      .then(setAnimationData)
      .catch(err => console.error("Failed to load Lottie:", err));
  }, []);

  // Stream the story whenever `prompt` changes
  useEffect(() => {
    if (!prompt) {
      navigate("/create");
      return;
    }

    setRawStory("");
    setIsStreaming(true);
    const controller = new AbortController();
    let firstChunk = true;

    (async () => {
      try {
        const res = await fetch("https://solana-storytime.vercel.app/api/story-generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: prompt }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Network response was not OK");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop()!;

          for (const chunk of parts) {
            const m = /^data:(.*)$/s.exec(chunk);
            if (!m) continue;
            const data = m[1];
            if (data === "[DONE]") {
              setIsStreaming(false);
              return;
            }
            if (!data.trim()) continue;
            if (firstChunk) {
              setIsStreaming(false);
              firstChunk = false;
            }
            console.log(data);
            setRawStory(prev => prev + data);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast({
            title: "Error",
            description: "Failed to generate story. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsStreaming(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [prompt, token, navigate, toast]);

  // Feedback form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apiRequest(
      "POST",
      "/api/submit-feedback",
      { storyPrompt: prompt, feedbackCode: selectedFeedbackCode, comment },
      { Authorization: `Bearer ${token}` }
    )
      .then(() => toast({ title: "Thanks!", description: "Your feedback has been submitted." }))
      .catch(() => toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" }));
  };

  // Save to library
  const handleSaveToLibrary = () => {
    const titleMatch = rawStory.match(/##\s*(.+?)\n\n/);
    const title = titleMatch ? titleMatch[1].trim() : null;
    const description = rawStory.replace(/##\s*.+?\n\n/, '').trim();

    apiRequest(
      "POST",
      "/api/add-story-to-library",
      { title, description },
      { Authorization: `Bearer ${token}` }
    )
      .then(() => toast({ title: "Saved!", description: "Story is now in your library." }))
      .catch(() => toast({ title: "Error", description: "Could not save the story.", variant: "destructive" }));
  };

  if (!animationData) return <div>Loading animation…</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Your Story</h1>
        <div className="w-6" />
      </header>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {isStreaming ? (
          <div className="flex-1 flex items-center justify-center">
            <Lottie
              lottieRef={lottieRef}
              animationData={animationData}
              loop
              autoplay
              style={{ width: "25%", height: "auto" }}
            />
          </div>
        ) : (
          <div className="bg-indigo-900/50 p-4 rounded-2xl shadow-md text-white text-lg whitespace-pre-wrap">
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // Override how <strong> is rendered:
    strong: ({ node, ...props }) => (
      <strong className="font-bold text-xl" {...props} />
    ),
  }}
>
  {rawStory ? formatStory(rawStory) : prompt}
</ReactMarkdown>


            {/* Feedback Form */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-indigo-900/50 space-y-4">
              <h2 className="text-lg font-bold">Feedback</h2>
              <div className="flex flex-wrap gap-4 justify-center mb-4">
                {feedbackOptions.map(({ code, src, alt }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedFeedbackCode(code)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg transition ${selectedFeedbackCode === code ? "bg-indigo-700" : "hover:bg-indigo-800"}`}>
                    <img src={src} alt={alt} className="w-12 h-12 object-contain" />
                    <p className="text-sm md:text-base text-center">{alt}</p>
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of this story?"
                className="w-full h-24 p-3 rounded-lg bg-indigo-900/40 border border-indigo-700/30 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <button
                type="submit"
                disabled={selectedFeedbackCode === null && !comment.trim()}
                className={`w-full p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg transition ${
                  selectedFeedbackCode !== null || comment.trim()
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-700/30"
                    : "bg-indigo-900/50 text-indigo-400 cursor-not-allowed"
                }`}>
                Submit Feedback
              </button>
            </form>

            <button
              onClick={handleSaveToLibrary}
              className="w-full mt-4 p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg transition bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-700/30">
              Save to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
