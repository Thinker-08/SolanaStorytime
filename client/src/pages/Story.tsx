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
import TextToSpeech2 from "../components/TextToSpeech2";
import { Star } from "lucide-react";

// Helper to collapse extra spaces and inject proper markdown breaks
function formatStory(text: string): string {
  return (
    text
      // collapse multiple newlines into one
      .replace(/\n{2,}/g, "\n\n")
      // collapse multiple spaces
      .replace(/ {2,}/g, " ")
      // convert lines that are entirely bolded (e.g., **Heading**) into level-2 markdown headings
      .replace(/^\*\*(.+?)\*\*\s*$/gm, "## $1")
      // special-case bolded Title: into heading
      .replace(/^\*\*\s*Title\s*:\s*(.+?)\s*\*\*\s*$/gim, "## $1")
      // horizontal rules
      .replace(/---/g, "---")
      // other custom rules for summary and parents section
      .replace(/###\s*Summary\s*for\s*Kids\s*:/gi, "### Summary for Kids:")
      .replace(
        /\*\*[\s\S]+For\s*Parents[\s\S]*$/m,
        (match) => `\n${match.trim()}\n`
      )
      .trim()
  );
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
  const [title, setTitle] = useState<string>("");

  // Load Lottie animation
  useEffect(() => {
    fetch(
      "https://res.cloudinary.com/dvnjvvuig/raw/upload/v1749042287/LottieFiles_Animation_guzybo.json"
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
        const titleMatch = data.message.match(/\*\*Title:\s*(.+?)\*\*/i);
        const title = titleMatch ? titleMatch[1].trim() : null;
        setTitle(title);
        if (title) {
          setRawStory(data.message.replace(/\*\*Title:\s*.+?\*\*\n\n/, ""));
        } else {
          setRawStory(data.message);
        }
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
        toast({
          title: "Saved!",
          description: "Story is now in your library.",
        })
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

    const getImage = (label: string) => {
    switch (label) {
      case "Image":
        return <img
        src="https://res.cloudinary.com/dvnjvvuig/image/upload/v1749042287/Image_from_Flaticon_1_nyhli8.png"
        alt="Image"
        className="w-8 h-8" />;
      case "Video":
        return <img src="https://res.cloudinary.com/dvnjvvuig/image/upload/v1749042287/Video_Icon_from_Cloudinary_z3i203.png" alt="Video" className="w-8 h-8" />;
      case "Coloring Paper":
        return (
          <img
            src="https://res.cloudinary.com/dvnjvvuig/image/upload/v1749042285/Colored_Pencils_Coloring_Paper_1_mufa1g.png"
            alt="Coloring Paper"
            className="w-8 h-8"
          />
        );
      case "Mint to NFT":
        return (
          <img
            src="https://res.cloudinary.com/dvnjvvuig/image/upload/v1749042286/NFT_Icon_1_klhn5m.png"
            alt="Mint to NFT"
            className="w-8 h-8"
          />
        );
      case "Use your own voice":
        return (
          <img
            src="https://res.cloudinary.com/dvnjvvuig/image/upload/v1749042287/Voice_Message_Icon_1_uv2po2.png"
            alt="Use your own voice"
            className="w-8 h-8"
          />
        );
      default:
        return null;
    }
  };

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
          <>
            {title && (
              <h2 className="text-3xl font-bold text-center mb-6 text-black">
                {title}
              </h2>
            )}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3">
              {["Image", "Video", "Coloring Paper", "Mint to NFT", "Use your own voice"].map(
                (label) => (
                  <button
                    key={label}
                    onClick={() =>
                      toast({
                        title: `${label} feature`,
                        description: "This feature is currently in works!",
                        variant: "default",
                      })
                    }
                    className="flex items-center justify-center gap-2 py-3 bg-violet-400 hover:bg-violet-500 text-white font-bold rounded-lg shadow"
                  >
                    { getImage(label) }
                  </button>
                )
              )}
              <TextToSpeech2 text={rawStory} isVisible={true} />
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-md text-black text-lg whitespace-pre-wrap">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({ node, ...props }) => (
                    <strong
                      className="font-bold text-xl text-black"
                      {...props}
                    />
                  ),
                }}
              >
                {rawStory ? formatStory(rawStory) : prompt}
              </ReactMarkdown>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <h2 className="text-lg font-extrabold text-black">Feedback</h2>
              <div className="flex flex-wrap gap-4 justify-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedFeedbackCode(code)}
                      className="p-2 transition"
                    >
              <Star
                className={`w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-32 lg:h-32 ${
                  selectedFeedbackCode !== null && code <= selectedFeedbackCode
                    ? "fill-yellow-400 stroke-yellow-500"
                    : "stroke-gray-400"
                }
              `}
              />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of this story?"
                className="w-full h-24 p-3 rounded-lg bg-white border border-indigo-700/30 text-black focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md resize-none placeholder-black"
              />
              <button
                type="submit"
                disabled={selectedFeedbackCode === null && !comment.trim()}
                className={`w-full p-4 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg ${
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
          </>
        )}
      </div>
    </div>
  );
}
