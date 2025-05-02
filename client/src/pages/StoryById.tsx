// src/pages/Story.tsx
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocation } from "wouter";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

type StoryData = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  category: string;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Story() {
  const { token, setToken } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [userName, setUserName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validateToken = () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      window.location.href = "/";
      return false;
    }
    try {
      const decoded = jwtDecode<TokenPayload>(authToken);
      const now = Math.floor(Date.now() / 1000);
      if (!decoded.id || !decoded.email || decoded.exp < now) {
        localStorage.removeItem("authToken");
        window.location.href = "/";
        return false;
      }
      setUserName(decoded.username);
      return true;
    } catch {
      localStorage.removeItem("authToken");
      window.location.href = "/";
      return false;
    }
  };

  useEffect(() => {
    validateToken();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken("");
    window.location.href = "/";
  };

  const [storyId, setStoryId] = useState<string | null>(null);
  useEffect(() => {
    const match = /^\/library\/([^/]+)$/.exec(window.location.pathname);
    if (match) {
      setStoryId(match[1]);
    } else {
      navigate("/home");
      setStoryId(null);
    }
  }, [navigate]);

  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [selectedFeedbackCode, setSelectedFeedbackCode] = useState<number | null>(null);

  const feedbackOptions = [
    { code: 1, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/lywu9ibb3gm2alhvcvzh.png", alt: "Loved it!!" },
    { code: 2, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/fkmkhqoa6xyi80a7cwpk.png", alt: "Felt connected" },
    { code: 3, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/dsxdjj7qoekw5djcpsp1.png", alt: "It was okay" },
    { code: 4, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/chrwsxmqm7k0xk2jhorl.png", alt: "Didn't click" },
    { code: 5, src: "https://res.cloudinary.com/dnzwzwnlg/image/upload/v1745864399/tj0ukdvtp01rzyvadq0c.png", alt: "Needs Improvement" },
  ];

  useEffect(() => {
    if (!storyId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiRequest(
          "GET",
          `/api/library-story?id=${storyId}`,
          undefined,
          { Authorization: `Bearer ${token}` }
        );
        if (!res.ok) throw new Error("Failed to load story");
        const data = await res.json();
        setStory(data);
      } catch (err) {
        toast({ title: "Error", description: "Unable to load the story.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [storyId, token, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFeedbackCode === null && !comment.trim()) return;
    try {
      await apiRequest(
        "POST",
        "/api/submit-feedback",
        { storyPrompt: story?.description, feedbackCode: selectedFeedbackCode, comment },
        { Authorization: `Bearer ${token}` }
      );
      toast({ title: "Thanks!", description: "Your feedback has been submitted." });
      setSelectedFeedbackCode(null);
      setComment("");
    } catch {
      toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-violet-100 text-white">
      <header className="p-4 flex items-center justify-between bg-white">
        <button onClick={() => window.history.back()} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6 text-violet-400" />
        </button>
        <h1 className="text-xl font-extrabold flex-1 text-center text-black">Your Story</h1>
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-400 font-semibold shadow-md"
          >
            {getInitials(userName)}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-indigo-800 rounded-md shadow-lg py-1 z-50">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-indigo-700 rounded-md"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {loading ? (
          <div className="text-center text-indigo-300">Generating story…</div>
        ) : story ? (
          <>
            <h2 className="text-3xl font-bold text-center mb-6 text-black">{story.title}</h2>
            <div className="bg-white p-4 rounded-2xl shadow-md text-lg whitespace-pre-wrap text-black">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{story.description}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="text-center text-red-400">Story not found.</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <h2 className="text-lg font-extrabold text-black">Feedback</h2>
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          {feedbackOptions.map(({ code, src, alt }) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedFeedbackCode(code)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition border border-white shadow-inner shadow-md-2 ${
                selectedFeedbackCode === code ? "bg-violet-400" : "hover:bg-purple-200"
              }`}
            >
              <img src={src} alt={alt} className="object-contain w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16" />
              <p className="text-sm md:text-base text-center text-black font-medium">{alt}</p>
            </button>
          ))}
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
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
