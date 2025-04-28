import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../hooks/use-toast";
import ChatHistory from "../components/ChatHistory";
import MessageInput from "../components/MessageInput";
import SamplePrompts from "../components/SamplePrompts";
import { jwtDecode } from "jwt-decode";
import TaskPane from "../components/TaskPane";
import { useSession } from "../context/SessionContext";

type Message = { role: "user" | "assistant"; content: string };

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export default function Home() {
  const { sessionId, setSessionId } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isTaskPaneOpen, setIsTaskPaneOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; title: string; description: string }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sessionParams, setSessionParams] = useState<{ storyType: string } | null>(null);

  const { toast } = useToast();
  const taskPaneRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validateToken = () => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.log("No token found. Redirecting to login.");
      window.location.href = "/";
      return false;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      if (!decoded.id || !decoded.email || !decoded.exp) {
        console.log("Invalid token format. Redirecting to login.");
        window.location.href = "/";
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp < currentTime) {
        localStorage.removeItem("authToken");
        window.location.href = "/";
        return false;
      }
      setUserName(decoded.username);
      return true;
    } catch (error) {
      localStorage.removeItem("authToken");
      window.location.href = "/";
      return false;
    }
  };

  useEffect(() => {
    if (!validateToken()) return;
    const storedSessionId = localStorage.getItem("sessionId");
    const token = localStorage.getItem("authToken");
    const newSessionId = storedSessionId || uuidv4();

    if (!storedSessionId) {
      localStorage.setItem("sessionId", newSessionId);
    }
    setItems(data);
    setToken(token);
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (taskPaneRef.current && !taskPaneRef.current.contains(event.target as Node)) &&
        (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
      ) {
        setIsTaskPaneOpen(false);
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!token || !sessionId) return;
    if (sessionParams !== null) return;
    const storedParams = localStorage.getItem("sessionParams");
    if (storedParams) {
      setSessionParams(JSON.parse(storedParams));
    }
  }, [token, sessionId, sessionParams]);

  const { data, isLoading: isLoadingSession } = useQuery({
    queryKey: [`/api/chat-session?sessionId=${sessionId}`],
    queryFn: async () => {
      const response = await fetch(`https://solana-storytime.vercel.app/api/chat-session?sessionId=${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch session data");
      }

      return response.json();
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data && "messages" in data && Array.isArray(data.messages)) {
      setMessages(data.messages);
    }
  }, [data]);

  const storyMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(
        "POST",
        "/api/chat-generate",
        {
          message,
          sessionId,
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: data.message,
        },
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to generate story: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: message },
    ]);
    storyMutation.mutate(message);
  };

  const handleSamplePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUserName("");
    setSessionId("");
    setSessionParams(null);
    localStorage.removeItem("sessionParams");
    localStorage.removeItem("sessionId");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-row bg-background">
      {/* Task Pane */}
      <div
        ref={taskPaneRef}
        className={`transition-all duration-300 overflow-hidden h-full
          ${isTaskPaneOpen ? "w-56 sm:w-64 md:w-72 lg:w-80" : "w-0"}`}
      >
        {isTaskPaneOpen && (
          <div className="h-full border-r border-muted-foreground bg-muted">
            <TaskPane {...{ token }} onClose={() => setIsTaskPaneOpen(false)} />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col px-4 md:px-8 lg:px-12 flex-1">
        {/* Header */}
        <header className="mb-6 text-center relative">
          {/* Left: Task Pane Button */}
          <div className="absolute top-0 left-0 p-2">
            {!isTaskPaneOpen && (
              <button
                onClick={() => setIsTaskPaneOpen(true)}
                aria-label="Open Task Pane"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: User Initials Dropdown */}
          <div ref={dropdownRef} className="absolute top-0 right-0 p-2">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold shadow-md hover:bg-accent transition"
              >
                {getInitials(userName)}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-md bg-background shadow-lg border border-muted-foreground py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Title */}
          <div className="flex items-center justify-center mb-2">
            <svg
              className="w-12 h-12 mr-3 text-primary drop-shadow-xl"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
              SolanaStories
            </h1>
          </div>
          <p className="text-md text-muted-foreground">
            Magical blockchain stories for curious minds
          </p>
        </header>

        {/* Sample Prompts */}
        <SamplePrompts onPromptClick={handleSamplePromptClick} />

        {/* Chat History */}
        <ChatHistory messages={messages} isLoading={storyMutation.isPending} />

        {/* Message Input */}
        <MessageInput onSendMessage={handleSendMessage} isDisabled={storyMutation.isPending} />

        {/* Footer */}
        <footer className="mt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SolanaStories • Educational stories about blockchain for children</p>
        </footer>
      </div>
    </div>
  );
}
