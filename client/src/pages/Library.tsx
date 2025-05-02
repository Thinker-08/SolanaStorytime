// src/pages/LibraryScreen.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { ArrowRight, Search, Book } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "wouter";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

type Story = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  category: string;
};

const colorClasses = [
  "bg-violet-200",
];

function getColorForStory(story: Story): string {
  const str = story.title || story.id.toString();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorClasses.length;
  return colorClasses[index];
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function LibraryScreen() {
  const { token, setToken } = useAuth();
  const [, navigate] = useLocation();
  const [userName, setUserName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // auth guard and extract username
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

  // close dropdown on outside click
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

  const [activeCategory, setActiveCategory] = useState("all");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest(
      "GET",
      "/api/library-stories",
      undefined,
      { Authorization: `Bearer ${token}` }
    )
      .then(async (res) => {
        const data = typeof res.json === "function" ? await res.json() : res;
        if (data.stories) setStories(data.stories);
        else console.warn("Unexpected response shape:", data);
      })
      .catch((err) => console.error("Failed to fetch stories:", err))
      .finally(() => setLoading(false));
  }, [token]);

  const storyCategories = useMemo(() => {
    const cats = new Set<string>();
    stories.forEach((s) => s.category && cats.add(s.category));
    return ["all", ...Array.from(cats)];
  }, [stories]);

  const filteredStories =
    activeCategory === "all"
      ? stories
      : stories.filter((s) => s.category === activeCategory);

  return (
    <div className="flex flex-col h-full bg-violet-100 text-white">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-white">
        <button className="text-indigo-300" onClick={() => navigate("/home")}
        >
          <ArrowRight className="h-6 w-6 rotate-180 text-violet-400" />
        </button>
        <h1 className="text-xl font-extrabold text-black">Story Library</h1>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full bg-violet-100 shadow-md">
            <Search className="h-5 w-5 text-violet-400" />
          </button>
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full text-violet-400 flex items-center justify-center text-indigo-300 font-semibold shadow-md bg-violet-100"
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

      {/* Categories */}
      <div className="p-4 overflow-x-auto bg-white bg-violet-100">
        <div className="flex gap-2">
          {storyCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-md transition-colors duration-200 ${
                activeCategory === category
                  ? "bg-violet-400 text-white font-bold"
                  : "bg-violet-50 text-black font-thin"
              }`}
            >
              {category === "all"
                ? "All Stories"
                : category[0].toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stories Grid */}
      <div className="flex-1 p-4 overflow-y-auto bg-violet-100">
        {loading ? (
          <div className="text-center text-indigo-300">
            Loading stories...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStories.length === 0 ? (
              <div className="text-center text-indigo-300 col-span-full">
                No stories found.
              </div>
            ) : (
              filteredStories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-xl overflow-hidden border border-white shadow-lg bg-indigo-900/20 backdrop-blur-sm"
                  onClick={() => navigate(`/library/${story.id}`)}
                >
                  <div
                    className={`h-32 ${getColorForStory(story)} flex items-center justify-center relative px-2`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent opacity-80" />
                    <div className="text-center relative z-10 max-w-full">
                      <h3 className="text-xl font-extrabold text-black leading-tight break-words">
                        {story.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-black text-sm mb-3 line-clamp-3">
                      {story.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-black">
                        {story.category[0].toUpperCase() + story.category.slice(1)}
                      </span>
                      <button className="flex items-center gap-1 text-violet-500 text-sm hover:underline">
                        <Book size={14} className="text-violet-500" />
                        Read
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
