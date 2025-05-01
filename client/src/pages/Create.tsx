// src/pages/Create.tsx
import React, { useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { usePrompt } from "../context/PromptContext";
import { useLocation } from "wouter";

type Option = { id: string; name: string };

export default function CreateStoryScreen() {
  const { setPrompt } = usePrompt();
  const [, navigate] = useLocation();

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

  // Only enable generation when all fields are filled
  const canGenerate = Boolean(
    childNickname && parentNickname && parentInterest && childInterest
  );

  // Helper to get names
  const parentInterestName =
    parentInterests.find((opt) => opt.id === parentInterest)?.name || "";
  const childInterestName =
    childInterests.find((opt) => opt.id === childInterest)?.name || "";

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Create your own Soul Story</h1>
        <div className="w-6" />
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Child's Nickname Input */}
        <div>
          <label className="block text-indigo-200 mb-2 font-medium">
            Child's Nickname
          </label>
          <input
            type="text"
            value={childNickname}
            onChange={(e) => setChildNickname(e.target.value)}
            placeholder="Enter child's nickname"
            className="w-full rounded-lg p-3 bg-indigo-900/40 text-indigo-100 placeholder-indigo-400 shadow-md"
          />
        </div>

        {/* Parent's Nickname Input */}
        <div>
          <label className="block text-indigo-200 mb-2 font-medium">
            Parent's Nickname
          </label>
          <input
            type="text"
            value={parentNickname}
            onChange={(e) => setParentNickname(e.target.value)}
            placeholder="Enter parent's nickname"
            className="w-full rounded-lg p-3 bg-indigo-900/40 text-indigo-100 placeholder-indigo-400 shadow-md"
          />
        </div>

        {/* Parent's Interest Selection */}
        <div>
          <label className="block text-indigo-200 mb-2 font-medium">
            {parentNickname ? `${parentNickname}'s Interest` : "Parent's Interest"}
          </label>
          <div className="bg-indigo-900/40 rounded-lg p-1 shadow-md">
            <div className="grid grid-cols-2 gap-2">
              {parentInterests.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setParentInterest(opt.id)}
                  className={`p-3 rounded-lg text-left text-sm ${
                    parentInterest === opt.id
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                      : "bg-indigo-800/50 text-indigo-200"
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
          <label className="block text-indigo-200 mb-2 font-medium">
            {childNickname ? `${childNickname}'s Interest` : "Child's Interest"}
          </label>
          <div className="bg-indigo-900/40 rounded-lg p-1 shadow-md">
            <div className="grid grid-cols-2 gap-2">
              {childInterests.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setChildInterest(opt.id)}
                  className={`p-3 rounded-lg text-left text-sm ${
                    childInterest === opt.id
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                      : "bg-indigo-800/50 text-indigo-200"
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
              ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-violet-700/30"
              : "bg-indigo-900/50 text-indigo-400"
          }`}
        >
          <BookOpen size={18} />
          Generate Story
        </button>
      </div>
    </div>
  );
}
