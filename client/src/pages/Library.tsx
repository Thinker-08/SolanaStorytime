import { useState, useEffect, useMemo } from "react";
import { ArrowRight, Search, Book } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "wouter";

type Story = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  category: string;
};

export default function LibraryScreen() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    // Don’t fetch until we have a token
    if (!token) return;

    setLoading(true);
    apiRequest("GET", "/api/library-stories", undefined, {
      Authorization: `Bearer ${token}`,
    })
      .then(async (res) => {
        // If apiRequest wraps fetch, it might already return JSON
        // so we guard both cases:
        const data = typeof res.json === "function" ? await res.json() : res;
        if (data.stories) {
          setStories(data.stories);
        } else {
          console.warn("Unexpected response shape:", data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch stories:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]); // <-- include token so effect runs when it arrives

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
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button className="text-indigo-300" onClick={() => navigate("/home")}>
          <ArrowRight className="h-6 w-6 rotate-180" />
        </button>
        <h1 className="text-xl font-bold">Story Library</h1>
        <button className="p-2 rounded-full bg-indigo-900/50 shadow-md">
          <Search className="h-5 w-5 text-indigo-300" />
        </button>
      </header>

      {/* Categories */}
      <div className="p-4 border-b border-indigo-900/50 overflow-x-auto">
        <div className="flex gap-2">
          {storyCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-md transition-colors duration-200 ${
                activeCategory === category
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                  : "bg-indigo-900/50 text-indigo-300"
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
      <div className="flex-1 p-4 overflow-y-auto">
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
                  className="rounded-xl overflow-hidden border border-indigo-800/30 shadow-lg bg-indigo-900/20 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80"></div>
                    <div className="relative z-10 text-center px-2">
                      <h3 className="text-xl font-bold text-white truncate">
                        {story.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-indigo-100 text-sm mb-3 line-clamp-3">
                      {story.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-800/50 text-indigo-200">
                        {story.category.toUpperCase() +
                          story.category.slice(1)}
                      </span>
                      <button className="flex items-center gap-1 text-violet-300 text-sm hover:underline">
                        <Book size={14} />
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
