// HomeScreen.tsx
import React from "react";
import {
  BookOpen,
  History,
  Sun,
  Plus,
  MessageSquare,
  Library,
  Home,
  Star,
  Book
} from "lucide-react";

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      
      {/* Header */}
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            SolanaStories
          </h1>
        </div>
        <div className="flex gap-3">
          <button className="p-2 rounded-full bg-indigo-900/50 shadow-md">
            <History className="h-5 w-5 text-violet-300" />
          </button>
          <button className="p-2 rounded-full bg-indigo-900/50 shadow-md">
            <Sun className="h-5 w-5 text-yellow-400" />
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Welcome, Parent!</h2>
          <p className="text-indigo-200">
            Create magical stories for your little ones
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {/* Create New Story */}
          <button
            onClick={() => window.location.href = "/create"}
            className="p-6 rounded-xl bg-gradient-to-br from-violet-900 to-indigo-900 border border-violet-500/30 flex items-center gap-4 hover:shadow-lg transition-all shadow-lg"
          >
            <div className="p-3 bg-violet-500/30 rounded-lg shadow-inner">
              <Plus size={24} className="text-violet-300" />
            </div>
            <div className="text-left">
              <h3 className="font-bold">Create New Story</h3>
              <p className="text-indigo-200 text-sm">
                Choose characters & concepts
              </p>
            </div>
          </button>

          {/* Story Assistant */}
          <button
            onClick={() => window.location.href = "/chat"}
            className="p-6 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-900 border border-blue-500/30 flex items-center gap-4 hover:shadow-lg transition-all shadow-lg"
          >
            <div className="p-3 bg-blue-500/30 rounded-lg shadow-inner">
              <MessageSquare size={24} className="text-blue-300" />
            </div>
            <div className="text-left">
              <h3 className="font-bold">Story Assistant</h3>
              <p className="text-indigo-200 text-sm">
                Chat for custom stories
              </p>
            </div>
          </button>

          {/* Story Library */}
          <button
            // onClick={() => onNavigate("library")}
            className="p-6 rounded-xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/30 flex items-center gap-4 hover:shadow-lg transition-all shadow-lg"
          >
            <div className="p-3 bg-purple-500/30 rounded-lg shadow-inner">
              <Library size={24} className="text-purple-300" />
            </div>
            <div className="text-left">
              <h3 className="font-bold">Story Library</h3>
              <p className="text-indigo-200 text-sm">
                Browse pre-made stories
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="grid grid-cols-3 border-t border-indigo-900/50">
        <button className="p-4 flex flex-col items-center justify-center text-violet-400">
          <Home size={20} />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button className="p-4 flex flex-col items-center justify-center text-indigo-300">
          <Star size={20} />
          <span className="text-xs mt-1">Favorites</span>
        </button>
        <button className="p-4 flex flex-col items-center justify-center text-indigo-300">
          <Book size={20} />
          <span className="text-xs mt-1">History</span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage;
