// src/pages/Story.tsx
import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { usePrompt } from "../context/PromptContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
    id: number;
    email: string;
    exp: number;
    username: string;
  };

export default function Story() {
  const [, navigate] = useLocation();
  const { prompt } = usePrompt();
  const { toast } = useToast();
  const { token } = useAuth();
  const [story, setStory] = useState<string>("");
  const [feedback, setFeedback] = useState("");

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
    onSuccess: (generated) => {
      setStory(generated);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate story. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (prompt) {
      storyMutation.mutate(prompt);
    }
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Feedback:", feedback);
    setFeedback("");
    toast({
      title: "Thanks!",
      description: "Your feedback has been submitted.",
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Your Story</h1>
        <div className="w-6" />
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {storyMutation.isPending ? (
          <div className="text-center text-indigo-300">Generating story...</div>
        ) : (
          <div className="bg-indigo-900/50 p-4 rounded-2xl shadow-md">
            <p className="text-indigo-100 whitespace-pre-line">
              {story || prompt}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-indigo-900/50 space-y-4">
        <h2 className="text-lg font-bold">Feedback</h2>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What did you think of this story?"
          className="w-full h-24 p-3 rounded-lg bg-indigo-900/40 border border-indigo-700/30 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-md"
        />
        <button
          type="submit"
          disabled={!feedback.trim()}
          className={`w-full p-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow-lg ${
            feedback
              ? "bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-700/30"
              : "bg-indigo-900/50 text-indigo-400 cursor-not-allowed"
          }`}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
