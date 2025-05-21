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
import TextToSpeech2 from "../components/TextToSpeech2";
import { Star, Heart } from "lucide-react";

const WALLET_ID = "DHMFYHv4Mtdv6VnGEqvQRTWWb7PDPWNSm7dRED7pLnX9";

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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

    const handleDonateClick = async () => {
    try {
      await navigator.clipboard.writeText(WALLET_ID);
      toast({
        title: "Wallet ID Copied",
        description: "Please donate to support the project!",
        variant: "default",
      });
    } catch (err) {
      console.error("Failed to copy wallet ID", err);
      toast({
        title: "Error",
        description: "Please donate to support the project!",
        variant: "default",
      });
    }
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
  const [selectedFeedbackCode, setSelectedFeedbackCode] = useState<
    number | null
  >(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);

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
        toast({
          title: "Error",
          description: "Unable to load the story.",
          variant: "destructive",
        });
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
        {
          storyPrompt: story?.description,
          feedbackCode: selectedFeedbackCode,
          comment,
        },
        { Authorization: `Bearer ${token}` }
      );
      toast({
        title: "Thanks!",
        description: "Your feedback has been submitted.",
      });
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

  const getImage = (label: string) => {
    switch (label) {
      case "Image":
        return <img
        src="https://res.cloudinary.com/dnzwzwnlg/image/upload/v1747766991/Image_from_Flaticon_uhqvql.png"
        alt="Image"
        className="w-8 h-8" />;
      case "Video":
        return <img src="https://res.cloudinary.com/dnzwzwnlg/image/upload/v1747766992/Video_icon_gjea4f.png" alt="Video" className="w-8 h-8" />;
      case "Coloring Paper":
        return (
          <img
            src="https://res.cloudinary.com/dnzwzwnlg/image/upload/v1747766992/Colored_Pencils_Coloring_Paper_hn3a6f.png"
            alt="Coloring Paper"
            className="w-8 h-8"
          />
        );
      case "Mint to NFT":
        return (
          <img
            src="https://res.cloudinary.com/dnzwzwnlg/image/upload/v1747766992/Nft_Icon_k7gpn4.png"
            alt="Mint to NFT"
            className="w-8 h-8"
          />
        );
      case "Use your own voice":
        return (
          <img
            src="https://res.cloudinary.com/dnzwzwnlg/image/upload/v1747860499/Voice_Message_Icon_g7tgbr.png"
            alt="Use your own voice"
            className="w-8 h-8"
          />
        );
      default:
        return null;
    }
  };

    const renderMedia = () => {
    if (!mediaUrl) return null;
    if (mediaType === 'image') {
      return <img src={mediaUrl} alt="story media" className="max-w-full mx-auto rounded-lg shadow-lg" />;
    }
    if (mediaType === 'video') {
      return <video src={mediaUrl} controls className="max-w-full mx-auto rounded-lg shadow-lg" />;
    }
    if (mediaType === 'pdf') {
      return <iframe src={mediaUrl} className="w-full h-96" title="Coloring Paper PDF" />;
    }
    if (mediaType === 'nft') {
      return <img src={mediaUrl} alt="Minted NFT" className="max-w-full mx-auto rounded-lg shadow-lg" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-violet-100 text-white">
      <header className="p-4 flex items-center justify-between bg-white">
        <button
          onClick={() => window.history.back()}
          className="text-indigo-300"
        >
          <ArrowLeft className="h-6 w-6 text-violet-400" />
        </button>
        <h1 className="text-xl font-extrabold flex-1 text-center text-black">
          Your Story
        </h1>
        <div ref={dropdownRef} className="relative flex gap-2">
                    <button
            onClick={handleDonateClick}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-red-500 shadow-md hover:bg-red-100 transition"
            title="Copy wallet ID"
          >
            <Heart className="h-5 w-5" />
          </button>
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
            <h2 className="text-3xl font-bold text-center mb-6 text-black">
              {story.title}
            </h2>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3">
              {[
                { label: 'Image', key: 'image_url', type: 'image' },
                { label: 'Video', key: 'video_url', type: 'video' },
                { label: 'Coloring Paper', key: 'coloring_paper_url', type: 'image' },
                { label: 'Mint to NFT', key: 'nft_url', type: 'image' },
                { label: 'Use your own voice', key: 'voice_url', type: 'video' },
              ].map(({ label, key, type }) => (
                <button
                  key={label}
                  onClick={() => {
                    const url = (story as any)[key] as string | undefined;
                    if (url) {
                      setMediaUrl(url);
                      setMediaType(type as any);
                    } else {
                      toast({ title: `${label} feature`, description: "This feature is currently in works!", variant: "default" });
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-violet-400 hover:bg-violet-500 text-white font-bold rounded-lg shadow"
                >
                  { getImage(label) }
                  {label}
                </button>
              ))}
              <TextToSpeech2 text={story.description} isVisible={true} />
            </div>
             {/* Display selected media */}
            {renderMedia()}
            <div className="bg-white p-4 rounded-2xl shadow-md text-lg whitespace-pre-wrap text-black">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {story.description}
              </ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="text-center text-red-400">Story not found.</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <h2 className="text-lg font-extrabold text-black">Feedback</h2>
        <div className="flex flex-wrap gap-4 justify-center mb-4">
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
      <div className="px-4 pb-4"></div>
    </div>
  );
}
