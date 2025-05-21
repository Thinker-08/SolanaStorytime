import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../hooks/use-toast";
import ChatHistory from "../components/ChatHistory";
import MessageInput from "../components/MessageInput";
import TaskPane from "../components/TaskPane";
import { jwtDecode } from "jwt-decode";
import { useSession } from "../context/SessionContext";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import {  Heart } from "lucide-react";

const WALLET_ID = "DHMFYHv4Mtdv6VnGEqvQRTWWb7PDPWNSm7dRED7pLnX9";

type Message = { role: "user" | "assistant"; content: string };

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

export default function Home() {
  const [, navigate] = useLocation();
  const { sessionId, setSessionId, clearSession } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const { token, setToken } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [isTaskPaneOpen, setIsTaskPaneOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toast } = useToast();
  const taskPaneRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
  clearSession();
}, []);

  useEffect(() => {
    if (!validateToken()) return;
    const stored = localStorage.getItem("sessionId");
    const id = stored || uuidv4();
    if (!stored) localStorage.setItem("sessionId", id);
    setSessionId(id);
  }, []);

  const { data } = useQuery({
    queryKey: ["/api/chat-session", sessionId],
    queryFn: async () => {
      const res = await fetch(
        `https://solana-storytime.vercel.app/api/chat-session?sessionId=${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.messages) setMessages(data.messages);
  }, [data]);

  const storyMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest(
        "POST",
        "/api/chat-generate",
        { message, sessionId },
        { Authorization: `Bearer ${token}` }
      ).then((r) => r.json()),
    onSuccess: (resp) => {
      setMessages((prev) => [...prev, { role: "assistant", content: resp.message }]);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSend = (msg: string) => {
    if (!msg.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    storyMutation.mutate(msg);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken("");
    window.location.href = "/";
  };

  // Close dropdown/task pane when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        taskPaneRef.current && !taskPaneRef.current.contains(e.target as Node)
      ) setIsTaskPaneOpen(false);
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-violet-100 text-white">
      {/* Header */}
      <header className="p-4 border-b border-indigo-900/50 flex justify-between items-center bg-white">
        <button onClick={() => navigate("/home")} className="text-indigo-300">
          <ArrowLeft className="h-6 w-6 text-violet-400" />
        </button>
        <h1 className="text-xl font-extrabold text-black">Story Assistant</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDonateClick}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-red-500 shadow-md hover:bg-red-100 transition"
            title="Copy wallet ID"
          >
            <Heart className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsTaskPaneOpen(true)}
            className="p-2 rounded-full bg-violet-100 shadow-md"
          >
            <Plus className="h-5 w-5 text-violet-400" />
          </button>
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
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-32">
        <div className="flex justify-center">
          <div className="bg-violet-200 rounded-full px-3 py-1 text-xs text-black">
            Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <ChatHistory messages={messages} isLoading={storyMutation.isPending} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-indigo-100 bg-white">
        <div className="flex items-center w-full rounded-xl p-1 bg-white">
          <MessageInput
            onSendMessage={handleSend}
            isDisabled={storyMutation.isPending}
            placeholder="Ask for a story..."
            className="flex-1 bg-transparent p-2 text-white placeholder-white"
          />
        </div>
      </div>

      {/* Task Pane Overlay */}
      {isTaskPaneOpen && (
        <div
          ref={taskPaneRef}
          className="absolute top-0 left-0 h-full w-64 bg-muted border-r border-muted-foreground"
        >
          <TaskPane token={token!} onClose={() => setIsTaskPaneOpen(false)} />
        </div>
      )}
    </div>
  );
}
