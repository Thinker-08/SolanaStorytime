import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  History,
  Sun,
  Plus,
  MessageSquare,
  Library,
  Home,
  Star,
  Book,
  Award,
  Heart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "wouter";
import { jwtDecode } from "jwt-decode";
import { useToast } from "../hooks/use-toast";

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

const WALLET_ID = "DHMFYHv4Mtdv6VnGEqvQRTWWb7PDPWNSm7dRED7pLnX9";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getRankFromCount = (count: number): "Bronze" | "Silver" | "Gold" => {
  if (count >= 10) return "Gold";
  if (count >= 5) return "Silver";
  return "Bronze";
};

const HomePage = () => {
  const [, navigate] = useLocation();
  const { token, setToken } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [storyCount, setStoryCount] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
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

  const fetchStoryCount = async () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) return;

    try {
      const response = await fetch(
        "https://solana-storytime.vercel.app/api/my-stories-count",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch story count");
        return;
      }

      const data = await response.json();
      setStoryCount(data.count || 0);
    } catch (err) {
      console.error("Error fetching story count", err);
    }
  };

  useEffect(() => {
    if (validateToken()) {
      fetchStoryCount();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken("");
    window.location.href = "/";
  };

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

  const rank = storyCount !== null ? getRankFromCount(storyCount) : null;

  return (
    <div className="flex flex-col min-h-screen bg-violet-100 text-white">
      {/* Header */}
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            polarismom
          </h1>
          {rank && (
            <div className="relative group ml-3">
              <span
                className={`
                  px-2 py-1 text-xs rounded-full font-bold shadow flex items-center gap-1 bg-white
                  ${rank === "Gold" ? "text-yellow-500" : ""}
                  ${rank === "Silver" ? "text-gray-400" : ""}
                  ${rank === "Bronze" ? "text-yellow-800" : ""}
                `}
              >
                <Award
                  className={`
                    h-4 w-4
                    ${rank === "Gold" ? "text-yellow-500" : ""}
                    ${rank === "Silver" ? "text-gray-400" : ""}
                    ${rank === "Bronze" ? "text-yellow-800" : ""}
                  `}
                />
                {rank}
              </span>

              <div
                className="
                  absolute top-full left-1/2 -translate-x-1/2 mt-2
                  bg-black text-white text-xs rounded-md px-3 py-2 shadow-lg
                  hidden group-hover:block z-50
                  max-w-[12rem]
                  whitespace-normal
                  break-words
                "
              >
                <p>
                  Achievement unlocked!
                  {rank === "Gold" && " You’ve created 10 or more stories."}
                  {rank === "Silver" && " You’ve created 5 or more stories."}
                  {rank === "Bronze" && " Keep going! 5 stories unlock Silver."}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Donate Heart Icon */}
          <button
            onClick={handleDonateClick}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-red-500 shadow-md hover:bg-red-100 transition"
            title="Copy wallet ID"
          >
            <Heart className="h-5 w-5" />
          </button>
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-violet-800 font-semibold shadow-md"
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
        </div>
      </header>

      {/* Rest of the component remains unchanged... */}
      {/* You can leave the rest of the JSX unchanged from your current version */}

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-black text-bold">
            <b>Welcome, Parent!</b>
          </h2>
          <p className="text-black">
            Create magical stories for your little ones
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {/* Create New Story */}
          <button
            onClick={() => navigate("/create")}
            className="p-6 rounded-xl bg-white border border-violet-500/30 flex items-center gap-4 hover:shadow-lg transition-all shadow-lg"
          >
            <div className="p-3 bg-violet-500/30 rounded-lg shadow-inner">
              <Plus size={24} className="text-violet-800" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-black">Create New Story</h3>
              <p className="text-black text-sm">Choose characters & concepts</p>
            </div>
          </button>

          {/* Story Assistant */}
          <button
            onClick={() => navigate("/chat")}
            className="p-6 rounded-xl bg-white border border-blue-500/30 flex items-center gap-4 hover:shadow-lg transition-all shadow-lg"
          >
            <div className="p-3 bg-violet-500/30 rounded-lg shadow-inner">
              <MessageSquare size={24} className="text-violet-800" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-black">Story Assistant</h3>
              <p className="text-black text-sm">Chat for custom stories</p>
            </div>
          </button>

          {/* Story Library */}
          <button
            onClick={() => navigate("/library?type=all")}
            className="p-6 rounded-xl bg-white border border-purple-500/30 flex items-center gap-4 hover:shadow-lg transition-all shadow-lg"
          >
            <div className="p-3 bg-violet-500/30 rounded-lg shadow-inner">
              <Library size={24} className="text-violet-800" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-black">Story Library</h3>
              <p className="text-black text-sm">Browse pre-made stories</p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="grid grid-cols-3 bg-white">
        <button
          className="p-4 flex flex-col items-center justify-center text-violet-400"
          onClick={() => navigate("/home")}
        >
          <Home size={20} className="text-violet-800" />
          <span className="text-xs mt-1 text-violet-800">Home</span>
        </button>
        <button
          className="p-4 flex flex-col items-center justify-center text-indigo-300"
          onClick={() =>
            navigate(`/library?type=${encodeURIComponent("Saved Stories")}`)
          }
        >
          <Star size={20} className="text-violet-800" />
          <span className="text-xs mt-1 text-violet-800">Saved Stories</span>
        </button>
        <button
          className="p-4 flex flex-col items-center justify-center text-indigo-300"
          onClick={() => navigate("/library")}
        >
          <Book size={20} className="text-violet-800" />
          <span className="text-xs mt-1 text-violet-800">Library</span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage;
