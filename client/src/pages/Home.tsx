import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import ChatHistory from "@/components/ChatHistory";
import MessageInput from "@/components/MessageInput";
import SamplePrompts from "@/components/SamplePrompts";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  // Initialize session and get welcome message
  useEffect(() => {
    const storedSessionId = localStorage.getItem("sessionId");
    const newSessionId = storedSessionId || uuidv4();
    
    if (!storedSessionId) {
      localStorage.setItem("sessionId", newSessionId);
    }
    
    setSessionId(newSessionId);
  }, []);

  const { data: sessionData, isLoading: isLoadingSession } = useQuery({
    queryKey: [`/api/chat/session/${sessionId}`],
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (sessionData) {
      setMessages(sessionData.messages);
    }
  }, [sessionData]);

  const storyMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/generate", {
        message,
        sessionId
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: data.message
        }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate story: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to chat
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "user",
        content: message
      }
    ]);
    
    // Generate story response
    storyMutation.mutate(message);
  };

  const handleSamplePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto p-4 bg-background">
      {/* Header */}
      <header className="mb-6 text-center">
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
        <p className="text-md text-muted-foreground">Magical blockchain stories for curious minds</p>
      </header>

      {/* Sample Prompts */}
      <SamplePrompts onPromptClick={handleSamplePromptClick} />

      {/* Chat History */}
      <ChatHistory 
        messages={messages} 
        isLoading={storyMutation.isPending} 
      />

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        isDisabled={storyMutation.isPending}
      />

      {/* Footer */}
      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} SolanaStories • Educational stories about blockchain for children</p>
      </footer>
    </div>
  );
}
