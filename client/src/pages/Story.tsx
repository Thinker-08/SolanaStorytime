// src/pages/Story.tsx
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { usePrompt } from "../context/PromptContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Lottie from 'lottie-react';

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

export default function Story() {
  const lottieRef = useRef();
  const [, navigate] = useLocation();
  const { prompt } = usePrompt();
  const { toast } = useToast();
  const { token } = useAuth();
  const [animationData, setAnimationData] = useState(null);

  const [story, setStory]               = useState<string>("");
  const [comment, setComment]           = useState<string>("");
  const [selectedFeedbackCode, setSelectedFeedbackCode] = useState<number | null>(null);

  const feedbackOptions = [
    { code: 1, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/lywu9ibb3gm2alhvcvzh.png",    alt: "Loved it!!"          },
    { code: 2, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/fkmkhqoa6xyi80a7cwpk.png", alt: "Felt connected" },
    { code: 3, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/dsxdjj7qoekw5djcpsp1.png",       alt: "It was okay"    },
    { code: 4, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/chrwsxmqm7k0xk2jhorl.png",          alt: "Didn't click"         },
    { code: 5, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/tj0ukdvtp01rzyvadq0c.png",      alt: "Needs Improvement"   },
  ];

  const storyMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest(
        "POST",
        "/api/chat-generate",
        { message, sessionId: "1" },
        { Authorization: `Bearer ${token}` }
      );
      const json = await res.json();
      return json.message as string;
    },
    onSuccess: setStory,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate story. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (prompt) storyMutation.mutate(prompt);
    if (prompt === "") navigate("/create");
  }, [prompt]);

  useEffect(() => {
    fetch(
      "https://res.cloudinary.com/dnzwzwnlg/raw/upload/v1745941973/bxzvidweal4petm3qlfs.json"
    )
      .then((res) => res.json())
      .then(setAnimationData)
      .catch((err) => console.error("Failed to load Lottie:", err));
  }, []);

  if (!animationData) return <div>Loading animation…</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you have both the numeric code and the comment
    console.log("Feedback code:", selectedFeedbackCode);
    console.log("Comment:", comment);

    // Example: send both to your backend
    apiRequest(
      "POST",
      "/api/submit-feedback",
      {
        storyPrompt: prompt,
        feedbackCode: selectedFeedbackCode,
        comment,
      },
      { Authorization: `Bearer ${token}` }
    )
      .then(() =>
        toast({
          title: "Thanks!",
          description: "Your feedback has been submitted.",
        })
      )
      .catch(() =>
        toast({
          title: "Error",
          description: "Could not submit feedback.",
          variant: "destructive",
        })
      );
  };

  const handleSaveToLibrary = () => {
    const titleMatch = story.match(/\*\*Title:\s*(.+?)\*\*/);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const description = titleMatch
      ? story.replace(titleMatch[0], '').trim()
      : story;
    apiRequest(
      "POST",
      "/api/add-story-to-library",
      {
        title,
        description,
      },
      { Authorization: `Bearer ${token}` }
    )      .then(() =>
      toast({
        title: "Thanks!",
        description: "Story is now saved to library.",
      })
    )
    .catch(() =>
      toast({
        title: "Error",
        description: "Could not save the story to library.",
        variant: "destructive",
      })
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      {/* — Header — */}
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Your Story</h1>
        <div className="w-6" />
      </header>

      {/* — Story Content — */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {storyMutation.isPending ? (
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {story || prompt}
          </ReactMarkdown>
                {/* — Feedback Form — */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-indigo-900/50 space-y-4"
      >
        <h2 className="text-lg font-bold">Feedback</h2>
        {/* — Responsive feedback icons — */}
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          {feedbackOptions.map(({ code, src, alt }) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedFeedbackCode(code)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg transition justify-center
                ${selectedFeedbackCode === code ? "bg-indigo-700" : "hover:bg-indigo-800"}
              `}
            >
              <img
                src={src}
                alt={alt}
                className="
                  object-contain
                  w-10 h-10
                  sm:w-12 sm:h-12
                  md:w-16 md:h-16
                "
              />
              <p className="text-sm md:text-base text-center">{alt}</p>
            </button>
          ))}
        </div>

        {/* — Optional text comment — */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you think of this story?"
          className="
            w-full h-24 p-3 rounded-lg
            bg-indigo-900/40 border border-indigo-700/30
            text-white focus:outline-none focus:ring-2 focus:ring-violet-500
            shadow-md resize-none
          "
        />

        {/* — Submit button only enabled when user picks an icon or types a comment — */}
        <button
          type="submit"
          disabled={selectedFeedbackCode === null && !comment.trim()}
          className={`
            w-full p-3 rounded-lg text-white font-medium
            flex items-center justify-center gap-2 shadow-lg
            transition
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
      <button
          className={
            "w-full p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg transition bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-700/30"
            }
          onClick = {() => handleSaveToLibrary()}
        >
          Save to Library
        </button>
        </div>
        )}
      </div>
    </div>
  );
}
