// src/pages/Create.tsx
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, BookOpen, Plus, Edit2, ArrowRight } from "lucide-react";
import { usePrompt } from "../context/PromptContext";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { useStorySession } from "../context/StorySessionContext";

// Option type
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
  const { clearStorySession } = useStorySession();
  const { setPrompt } = usePrompt();
  const [, navigate] = useLocation();
  const { token, setToken } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [newParentInterest, setNewParentInterest] = useState("");
  const [newChildInterest, setNewChildInterest] = useState("");
  const [newTheme, setNewTheme] = useState("");

  // State for nicknames and selections
  const [childNickname, setChildNickname] = useState("");
  const [parentNickname, setParentNickname] = useState("");
  const [parentInterest, setParentInterest] = useState("");
  const [childInterest, setChildInterest] = useState("");
  const [theme, setTheme] = useState("");
  const [parentInterests, setParentInterests] = useState<Option[]>([]);
  const [childInterests, setChildInterests] = useState<Option[]>([]);
  const [themes, setThemes] = useState<Option[]>([]);

  // Validate token & fetch preferences
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
    if (validateToken()) {
      fetchUserPreferences();
    }
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken("");
    window.location.href = "/";
  };

  // Click outside to close dropdown
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Fetch existing preferences
  const fetchUserPreferences = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch(
        "https://solana-storytime.vercel.app/api/user-preferences",
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const json = await res.json();
      const prefs = json.data;
      setParentInterests(prefs.parents_interest || []);
      setChildInterests(prefs.children_interest || []);
      setThemes(prefs.themes || []);
      setParentNickname(prefs.parents_name?.[0]?.name || "");
      setChildNickname(prefs.children_name?.[0]?.name || "");
    } catch (err) {
      console.error("Error loading preferences:", err);
    }
  };

  // Add new preference helper
  const addPreference = async (type: string, name: string) => {
    try {
      await fetch("https://solana-storytime.vercel.app/api/add-user-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, name }),
      });
      await fetchUserPreferences();
    } catch (err) {
      console.error(`Failed to add ${type}:`, err);
    }
  };

  // Update existing preference helper
  const updatePreference = async (type: string, id: string) => {
    const newName = prompt("Enter new name:");
    if (!newName) return;
    try {
      await fetch("https://solana-storytime.vercel.app/api/update-user-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, id, name: newName }),
      });
      await fetchUserPreferences();
    } catch (err) {
      console.error(`Failed to update ${type}:`, err);
    }
  };

  const saveNames = async() => {
    try {
      await fetch("https://solana-storytime.vercel.app/api/update-user-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "parents_name", name: parentNickname }),
      })
    } catch (err) {
      console.error(`Failed to save parent nickname:`, err);
    }
    try {
      await fetch("https://solana-storytime.vercel.app/api/update-user-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "children_name", name: childNickname }),
      })
    } catch (err) {
      console.error(`Failed to save child nickname:`, err);
    }
  }

  const canGenerate = Boolean(
    childNickname && parentNickname && parentInterest && childInterest && theme
  );

  const parentInterestName =
    parentInterests.find((opt) => opt.id === parentInterest)?.name || "";
  const childInterestName =
    childInterests.find((opt) => opt.id === childInterest)?.name || "";
  const themeName =
    themes.find((opt) => opt.id === theme)?.name || "";

  return (
    <div className="flex flex-col h-screen bg-violet-100 text-white">
      <header className="p-4 flex justify-between items-center bg-white">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6 text-violet-400" />
        </button>
        <h1 className="text-xl font-bold text-black">Create your own Soul Story</h1>
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-indigo-800 font-semibold shadow-md"
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
        {/* Child Nickname */}
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

        {/* Parent Nickname */}
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

        {/* Parent Interests */}
        <div>
          <label className="block text-black mb-2 font-medium">
            {parentNickname ? `${parentNickname}'s Interest` : "Parent's Interest"}
          </label>
          <div className="bg-white rounded-lg p-2 shadow-md space-y-2">
            <div className="flex justify-end px-6">
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-sm text-indigo-800 underline"
              >
                {editMode ? 'Done' : 'Edit/Add'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {parentInterests.map((opt) => (
                <div key={opt.id} className="relative">
                  <button
                    onClick={() => setParentInterest(opt.id)}
                    className={`w-full p-3 rounded-lg text-left text-sm ${
                      parentInterest === opt.id
                        ? 'bg-violet-400 text-white shadow-md'
                        : 'bg-purple-50 text-black'
                    }`}
                  >
                    {opt.name}
                  </button>
                  {editMode && (
                    <Edit2
                      className="absolute top-1 right-1 cursor-pointer text-violet-400"
                      size={16}
                      onClick={() => updatePreference('parents_interest', opt.id)}
                    />
                  )}
                </div>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newParentInterest}
                  onChange={(e) => setNewParentInterest(e.target.value)}
                  placeholder="Add new interest"
                  className="flex-1 rounded-lg p-2 bg-purple-50 text-black border"
                />
                <ArrowRight
                  className="text-violet-400"
                  size={18}
                  onClick={() => {
                    if (!newParentInterest.trim()) return;
                    addPreference('parents_interest', newParentInterest.trim());
                    setNewParentInterest('');
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Child Interests */}
        <div>
          <label className="block text-black mb-2 font-medium">
            {childNickname ? `${childNickname}'s Interest` : "Child's Interest"}
          </label>
          <div className="bg-white rounded-lg p-2 shadow-md space-y-2">
            <div className="flex justify-end px-6">
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-sm text-indigo-800 underline"
              >
                {editMode ? 'Done' : 'Edit/Add'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {childInterests.map((opt) => (
                <div key={opt.id} className="relative">
                  <button
                    onClick={() => setChildInterest(opt.id)}
                    className={`w-full p-3 rounded-lg text-left text-sm ${
                      childInterest === opt.id
                        ? 'bg-violet-400 text-white shadow-md'
                        : 'bg-purple-50 text-black'
                    }`}
                  >
                    {opt.name}
                  </button>
                  {editMode && (
                    <Edit2
                      className="absolute top-1 right-1 cursor-pointer text-indigo-600"
                      size={16}
                      onClick={() => updatePreference('children_interest', opt.id)}
                    />
                  )}
                </div>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newChildInterest}
                  onChange={(e) => setNewChildInterest(e.target.value)}
                  placeholder="Add new interest"
                  className="flex-1 rounded-lg p-2 bg-purple-50 text-black border"
                />
                <ArrowRight
                  className="text-violet-400"
                  size={18}
                  onClick={() => {
                    if (!newChildInterest.trim()) return;
                    addPreference('children_interest', newChildInterest.trim());
                    setNewChildInterest('');
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-black mb-2 font-medium">
            Story's Theme
          </label>
          <div className="bg-white rounded-lg p-2 shadow-md space-y-2">
            <div className="flex justify-end px-6">
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-sm text-indigo-800 underline"
              >
                {editMode ? 'Done' : 'Edit/Add'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((opt) => (
                <div key={opt.id} className="relative">
                  <button
                    onClick={() => setTheme(opt.id)}
                    className={`w-full p-3 rounded-lg text-left text-sm ${
                      theme === opt.id
                        ? 'bg-violet-400 text-white shadow-md'
                        : 'bg-purple-50 text-black'
                    }`}
                  >
                    {opt.name}
                  </button>
                  {editMode && (
                    <Edit2
                      className="absolute top-1 right-1 cursor-pointer text-indigo-600"
                      size={16}
                      onClick={() => updatePreference('themes', opt.id)}
                    />
                  )}
                </div>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  placeholder="Add new Theme"
                  className="flex-1 rounded-lg p-2 bg-purple-50 text-black border"
                />
                <ArrowRight
                  className="text-violet-400"
                  size={18}
                  onClick={() => {
                    if (!newTheme.trim()) return;
                    addPreference('themes', newTheme.trim());
                    setNewTheme('');
                  }}
                />
              </div>
            )}
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
              `while ${childNickname} embarks on an adventure as a ${childInterestName}. Make the story ` +
              `to be in the theme of ${themeName}. Always add emojis and use highlight/bold to make the story more readable.`;
            setPrompt(storyPrompt);
            clearStorySession();
            saveNames();
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
