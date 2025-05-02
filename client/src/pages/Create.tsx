// src/pages/Create.tsx
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { usePrompt } from "../context/PromptContext";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";

type Option = { id: string; name: string };

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function CreateStoryScreen() {
  const { setPrompt } = usePrompt();
  const [, navigate] = useLocation();
  const { token, setToken } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth validation on mount
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

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken("");
    window.location.href = "/";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // State for nicknames and interests
  const [childNickname, setChildNickname] = useState("");
  const [parentNickname, setParentNickname] = useState("");
  const [parentInterest, setParentInterest] = useState("");
  const [childInterest, setChildInterest] = useState("");

  const parentInterests: Option[] = [
    { id: "defi", name: "DeFi" },
    { id: "tokenomics", name: "Tokenomics" },
    { id: "rugpullers", name: "Rug Pullers" },
    { id: "validators", name: "Validators" },
    { id: "developers", name: "Developers" },
    { id: "nft", name: "NFT" },
  ];

  const childInterests: Option[] = [
    { id: "princess", name: "Princess" },
    { id: "dragon", name: "Dragon" },
    { id: "spacekid", name: "Space Explorer" },
    { id: "pirate", name: "Pirate" },
    { id: "fairy", name: "Fairy" },
    { id: "robot", name: "Robot" },
  ];

  const canGenerate = Boolean(
    childNickname && parentNickname && parentInterest && childInterest
  );

  const parentInterestName =
    parentInterests.find((opt) => opt.id === parentInterest)?.name || "";
  const childInterestName =
    childInterests.find((opt) => opt.id === childInterest)?.name || "";

  return (
    <div className="flex flex-col h-full bg-violet-100 text-white">
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold text-black">Create your own Soul Story</h1>
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-800 font-semibold shadow-md"
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

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Child's Nickname Input */}
        <div>
          <label className="block text-black mb-2 font-medium">
            Child's Nickname
          </label>
          <input
            type="text"
            value={childNickname}
            onChange={(e) => setChildNickname(e.target.value)}
            placeholder="Enter child's nickname"
            className="w-full rounded-lg p-3 bg-white text-black placeholder-black shadow-md"
          />
        </div>

        {/* Parent's Nickname Input */}
        <div>
          <label className="block text-black mb-2 font-medium">
            Parent's Nickname
          </label>
          <input
            type="text"
            value={parentNickname}
            onChange={(e) => setParentNickname(e.target.value)}
            placeholder="Enter parent's nickname"
            className="w-full rounded-lg p-3 bg-white text-black placeholder-black shadow-md"
          />
        </div>

        {/* Parent's Interest Selection */}
        <div>
          <label className="block text-black mb-2 font-medium">
            {parentNickname ? `${parentNickname}'s Interest` : "Parent's Interest"}
          </label>
          <div className="bg-white rounded-lg p-2 shadow-md">
            <div className="grid grid-cols-2 gap-2">
              {parentInterests.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setParentInterest(opt.id)}
                  className={`p-3 rounded-lg text-left text-sm ${
                    parentInterest === opt.id
                      ? "bg-violet-400 text-white shadow-md"
                      : "bg-purple-50 text-black"
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Child's Interest Selection */}
        <div>
          <label className="block text-black font-medium">
            {childNickname ? `${childNickname}'s Interest` : "Child's Interest"}
          </label>
          <div className="bg-white rounded-lg p-1 shadow-md">
            <div className="grid grid-cols-2 gap-2">
              {childInterests.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setChildInterest(opt.id)}
                  className={`p-3 rounded-lg text-left text-sm ${
                    childInterest === opt.id
                      ? "bg-violet-400 text-white shadow-md"
                      : "bg-purple-50 text-black"
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-4 border-t border-indigo-900/50">
        <button
          disabled={!canGenerate}
          onClick={() => {
            const storyPrompt =
              `Create a heartwarming story centered around ${childNickname} and ${parentNickname}, ` +
              `${parentNickname} explores the world of ${parentInterestName}, ` +
              `while ${childNickname} embarks on an adventure as a ${childInterestName}.`;
            setPrompt(storyPrompt);
            navigate("/story");
          }}
          className={`w-full p-4 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg ${
            canGenerate
              ? "bg-violet-400 text-white font-extrabold shadow-violet-700/30"
              : "bg-violet-200 font-extrabold text-white"
          }`}
        >
          <BookOpen size={18} />
          Generate Story
        </button>
      </div>
    </div>
  );
}
