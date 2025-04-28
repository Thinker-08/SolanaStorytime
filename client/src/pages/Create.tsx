// src/pages/Create.tsx
import React, { useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { usePrompt } from "../context/PromptContext";
import { useLocation } from "wouter";

type Option = { id: string; name: string };

export default function CreateStoryScreen() {
  const { setPrompt } = usePrompt();
  const [, navigate] = useLocation();

  const [solanaElement, setSolanaElement] = useState("");
  const [character, setCharacter] = useState("");
  const [childAge, setChildAge] = useState("");

  const solanaElements: Option[] = [
    { id: "blockchain", name: "Magic Chain of Memory Boxes" },
    { id: "sol", name: "Sunshine Coins" },
    { id: "wallet", name: "Friendly Ghost Pouch" },
    { id: "smart-contract", name: "Promise Scroll" },
    { id: "validator", name: "Helper Heroes" },
    { id: "nft", name: "One-of-a-kind Treasure Cards" },
  ];

  const characters: Option[] = [
    { id: "princess", name: "Princess" },
    { id: "dragon", name: "Dragon" },
    { id: "spacekid", name: "Space Explorer" },
    { id: "pirate", name: "Pirate" },
    { id: "fairy", name: "Fairy" },
    { id: "robot", name: "Robot" },
  ];

  const ageOptions: Option[] = [
    { id: "5", name: "5 years" },
    { id: "6", name: "6 years" },
    { id: "7", name: "7 years" },
    { id: "8", name: "8 years" },
    { id: "9", name: "9 years" },
    { id: "10", name: "10 years" },
  ];

  const getPrompt = () =>
    solanaElement && character && childAge
      ? `Create a story for a ${childAge}-year-old about a ${
          characters.find((c) => c.id === character)!.name.toLowerCase()
        } who discovers the ${
          solanaElements.find((e) => e.id === solanaElement)!.name
        } in the magical Solana Kingdom.`
      : "";

  const prompt = getPrompt();
  const canGenerate = Boolean(prompt);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Create a Story</h1>
        <div className="w-6" />
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Age Selection */}
        <div>
          <label className="block text-indigo-200 mb-2 font-medium">
            Child's Age
          </label>
          <div className="bg-indigo-900/40 rounded-lg p-1 shadow-md">
            <div className="grid grid-cols-3 gap-2">
              {ageOptions.map((age) => (
                <button
                  key={age.id}
                  onClick={() => setChildAge(age.id)}
                  className={`p-3 rounded-lg text-center text-sm ${
                    childAge === age.id
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                      : "bg-indigo-800/50 text-indigo-200"
                  }`}
                >
                  {age.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Solana Element Selection */}
        <div>
          <label className="block text-indigo-200 mb-2 font-medium">
            Select a Solana Element
          </label>
          <div className="bg-indigo-900/40 rounded-lg p-1 shadow-md">
            <div className="grid grid-cols-2 gap-2">
              {solanaElements.map((el) => (
                <button
                  key={el.id}
                  onClick={() => setSolanaElement(el.id)}
                  className={`p-3 rounded-lg text-left text-sm ${
                    solanaElement === el.id
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                      : "bg-indigo-800/50 text-indigo-200"
                  }`}
                >
                  {el.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Character Selection */}
        <div>
          <label className="block text-indigo-200 mb-2 font-medium">
            Select a Character
          </label>
          <div className="bg-indigo-900/40 rounded-lg p-1 shadow-md">
            <div className="grid grid-cols-2 gap-2">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setCharacter(char.id)}
                  className={`p-3 rounded-lg text-left text-sm ${
                    character === char.id
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                      : "bg-indigo-800/50 text-indigo-200"
                  }`}
                >
                  {char.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt Preview */}
        <div className="pt-2">
          <h3 className="text-indigo-200 mb-2 font-medium">Story Prompt:</h3>
          <div className="bg-indigo-900/40 rounded-lg p-4 border border-indigo-700/30 shadow-md">
            {canGenerate ? (
              <p className="text-indigo-100">{prompt}</p>
            ) : (
              <p className="text-indigo-300 italic">
                Select age, Solana element, and character to generate your
                story prompt...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-4 border-t border-indigo-900/50">
        <button
          disabled={!canGenerate}
          onClick={() => {
            setPrompt(prompt);
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
