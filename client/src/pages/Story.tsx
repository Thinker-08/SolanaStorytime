import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { usePrompt } from "../context/PromptContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/use-toast";
import { useStorySession } from "../context/StorySessionContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Lottie from "lottie-react";
import TextToSpeech from "../components/TextToSpeech";

// Helper to collapse extra spaces and inject proper markdown breaks
function formatStory(text: string): string {
  return text
    // collapse multiple newlines into one
    .replace(/\n{2,}/g, "\n")
    // collapse multiple spaces
    .replace(/ {2,}/g, " ")
    // convert lines that are entirely bolded (e.g., **Heading**) into level-2 markdown headings
    .replace(/^\*\*(.+?)\*\*\s*$/gm, "## $1")
    // special-case bolded Title: into heading
    .replace(/^\*\*\s*Title\s*:\s*(.+?)\s*\*\*\s*$/gmi, "## $1")
    // horizontal rules
    .replace(/---/g, "---")
    // other custom rules for summary and parents section
    .replace(
      /###\s*Summary\s*for\s*Kids\s*:/gi,
      "### Summary for Kids:"
    )
    .replace(
      /\*\*[\s\S]+For\s*Parents[\s\S]*$/m,
      match => `\n${match.trim()}\n`
    )
    .trim();
}

export default function Story() {
  const lottieRef = useRef<any>();
  const [, navigate] = useLocation();
  const { prompt } = usePrompt();
  const { toast } = useToast();
  const { token } = useAuth();
  const [animationData, setAnimationData] = useState<any>(null);
  const { storySessionId, setStorySessionId } = useStorySession();
  const [rawStory, setRawStory] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  const [selectedFeedbackCode, setSelectedFeedbackCode] = useState<
    number | null
  >(null);

  const feedbackOptions = [
    {
      code: 1,
      src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/lywu9ibb3gm2alhvcvzh.png",
      alt: "Loved it!!",
    },
    {
      code: 2,
      src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/fkmkhqoa6xyi80a7cwpk.png",
      alt: "Felt connected",
    },
    {
      code: 3,
      src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/dsxdjj7qoekw5djcpsp1.png",
      alt: "It was okay",
    },
    {
      code: 4,
      src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/chrwsxmqm7k0xk2jhorl.png",
      alt: "Didn't click",
    },
    {
      code: 5,
      src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/tj0ukdvtp01rzyvadq0c.png",
      alt: "Needs Improvement",
    },
  ];

  // Load Lottie animation
  useEffect(() => {
    fetch(
      "https://res.cloudinary.com/dnzwzwnlg/raw/upload/v1745941973/bxzvidweal4petm3qlfs.json"
    )
      .then((res) => res.json())
      .then(setAnimationData)
      .catch((err) => console.error("Failed to load Lottie:", err));
  }, []);

  // Stream the story whenever `prompt` changes
  const sendMessage = async (message: string) => {
    setRawStory("");
    setIsStreaming(true);

    try {
      const url = new URL(
        "https://solana-storytime.vercel.app/api/story-generate",
        window.location.origin
      );
      if (storySessionId) {
        url.searchParams.set("sessionId", storySessionId);
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error("Network response was not OK");
      }

      const data = await res.json();

      // Store new sessionId if provided
      if (data.sessionId) {
        setStorySessionId(data.sessionId);
      }

      // Set the story text
      if (data.message) {
        setRawStory(data.message);
      } else {
        throw new Error("No story message in response");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch story.",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // On mount / prompt change: get the story
  useEffect(() => {
    if (!prompt) {
      navigate("/create");
      return;
    }
    sendMessage(prompt);
  }, [prompt]);

  // Feedback “remix” uses same static request
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const feedbackText = comment || `Feedback code: ${selectedFeedbackCode}`;
    sendMessage(feedbackText);
    setComment("");
    setSelectedFeedbackCode(null);
  };

  // Save to library
  const handleSaveToLibrary = () => {
    const titleMatch = rawStory.match(/##\s*(.+?)\n\n/);
    const title = titleMatch ? titleMatch[1].trim() : null;
    const description = rawStory.replace(/##\s*.+?\n\n/, "").trim();

    fetch("https://solana-storytime.vercel.app/api/add-story-to-library", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description }),
    })
      .then(() =>
        toast({ title: "Saved!", description: "Story is now in your library." })
      )
      .catch(() =>
        toast({
          title: "Error",
          description: "Could not save the story.",
          variant: "destructive",
        })
      );
  };

  if (!animationData) return <div>Loading animation…</div>;

  return (
    <div className="flex flex-col h-screen bg-violet-100 text-white">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-white">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-black text-black">Your Story</h1>
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
          <div className="bg-white p-4 rounded-2xl shadow-md text-black text-lg whitespace-pre-wrap">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-xl text-black" {...props} />
                ),
              }}
            >
              {rawStory ? formatStory(rawStory) : prompt}
            </ReactMarkdown>
            <TextToSpeech text={rawStory} isVisible={!!rawStory} />

            {/* Feedback Form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-indigo-900/50 space-y-4"
            >
              <h2 className="text-lg font-bold">Feedback</h2>
              <div className="overflow-x-auto">
                <div className="flex gap-4 mb-4 w-max px-2">
                  {feedbackOptions.map(({ code, src, alt }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedFeedbackCode(code)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg transition ${
                        selectedFeedbackCode === code
                          ? "bg-violet-400"
                          : "hover:bg-purple-200"
                      }`}
                    >
                      <img
                        src={src}
                        alt={alt}
                        className="w-12 h-12 object-contain"
                      />
                      <p className="text-sm md:text-base text-center">{alt}</p>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of this story?"
                className="w-full h-24 p-3 rounded-lg bg-white border border-indigo-700/30 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />

              <button
                type="submit"
                disabled={selectedFeedbackCode === null && !comment.trim()}
                className={`w-full p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg transition ${
                  selectedFeedbackCode !== null || comment.trim()
                    ? "bg-violet-400 text-white font-extrabold shadow-violet-700/30"
                    : "bg-violet-200 font-extrabold text-white"
                }`}
              >
                Remix Story
              </button>
            </form>

            <button
              onClick={handleSaveToLibrary}
              className="w-full mt-4 p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg transition bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-700/30"
            >
              Save to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
