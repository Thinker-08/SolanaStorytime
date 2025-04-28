import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocation } from "wouter";

type StoryData = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  category: string;
};

export default function Story() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  // 1. Parse the storyId from the URL path: /stories/:id
  const [storyId, setStoryId] = useState<string | null>(null);
  useEffect(() => {
    const match = /^\/library\/([^/]+)$/.exec(window.location.pathname);
    if (match) {
      setStoryId(match[1]);
    } else {
      // no valid ID → go back home
      navigate("/home");
      setStoryId(null);
    }
  }, []);

  // 2. Local state
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [selectedFeedbackCode, setSelectedFeedbackCode] = useState<number | null>(null);

  const feedbackOptions = [
    { code: 1, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/lywu9ibb3gm2alhvcvzh.png",    alt: "Loved it!!"          },
    { code: 2, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/fkmkhqoa6xyi80a7cwpk.png", alt: "Felt connected" },
    { code: 3, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/dsxdjj7qoekw5djcpsp1.png",       alt: "It was okay"    },
    { code: 4, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/chrwsxmqm7k0xk2jhorl.png",          alt: "Didn't click"         },
    { code: 5, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/tj0ukdvtp01rzyvadq0c.png",      alt: "Needs Improvement"   },
  ];

  // 3. Fetch story details when we have a valid ID
  useEffect(() => {
    if (!storyId) return;

    const fetchStory = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(
          "GET",
          `/api/library-story?id=${storyId}`,
          undefined,
          { Authorization: `Bearer ${token}` }
        );
        if (!res.ok) throw new Error("Failed to load story");
        const story = await res.json();
        setStory(story);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Unable to load the story.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId, token, toast]);

  // 4. Feedback submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFeedbackCode === null && !comment.trim()) return;

    try {
      await apiRequest(
        "POST",
        "/api/submit-feedback",
        {
          storyPrompt: story?.description,
          feedbackCode: selectedFeedbackCode,
          comment,
        },
        { Authorization: `Bearer ${token}` }
      );
      toast({ title: "Thanks!", description: "Your feedback has been submitted." });
      setSelectedFeedbackCode(null);
      setComment("");
    } catch {
      toast({
        title: "Error",
        description: "Could not submit feedback.",
        variant: "destructive",
      });
    }
  };

  // 5. Render
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      {/* Header with native back */}
      <header className="p-4 border-b border-indigo-900/50 flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="text-indigo-300"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold flex-1">Your Story</h1>
      </header>

      {/* Story Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
  {loading ? (
    <div className="text-center text-indigo-300">Generating story…</div>
  ) : story ? (
    <>
      <h2 className="text-3xl font-bold text-center mb-6">{story.title}</h2>

      <div className="bg-indigo-900/50 p-4 rounded-2xl shadow-md text-white text-lg whitespace-pre-wrap">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {story.description}
        </ReactMarkdown>
      </div>
    </>
  ) : (
    <div className="text-center text-red-400">Story not found.</div>
  )}
</div>


      {/* Feedback Form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-indigo-900/50 space-y-4"
      >
        <h2 className="text-lg font-bold">Feedback</h2>

        <div className="flex flex-wrap gap-4 justify-center mb-4">
          {feedbackOptions.map(({ code, src, alt }) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedFeedbackCode(code)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg transition
                ${selectedFeedbackCode === code ? "bg-indigo-700" : "hover:bg-indigo-800"}
              `}
            >
              <img
                src={src}
                alt={alt}
                className="object-contain w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16"
              />
              <p className="text-sm md:text-base text-center">{alt}</p>
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you think of this story?"
          className="
            w-full h-24 p-3 rounded-lg bg-indigo-900/40 border border-indigo-700/30
            text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md resize-none
          "
        />

        <button
          type="submit"
          disabled={selectedFeedbackCode === null && !comment.trim()}
          className={`
            w-full p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg transition
            ${
              selectedFeedbackCode !== null || comment.trim()
                ? "bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-700/30"
                : "bg-indigo-900/50 text-indigo-400 cursor-not-allowed"
            }
          `}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
