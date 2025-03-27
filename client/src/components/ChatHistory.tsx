import { useRef, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaRobot, FaUser } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatHistory = ({ messages, isLoading }: ChatHistoryProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // State to track if voices have loaded
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  // Initialize speech synthesis
  useEffect(() => {
    // Function to handle voices changed event
    const handleVoicesChanged = () => {
      setVoicesLoaded(true);
    };
    
    // Check if voices are already loaded
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoicesLoaded(true);
    }
    
    // Add event listener for voices changed
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    
    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  // Text-to-speech functionality
  const speak = (text: string, index: number) => {
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    if (speakingIndex === index) {
      setSpeakingIndex(null);
      return;
    }
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set a child-friendly voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      voice => 
        (voice.name.includes("female") || 
         voice.name.includes("girl") || 
         voice.name.includes("Female") ||
         voice.name.toLowerCase().includes("samantha")) && 
        voice.lang.includes("en")
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Set moderate rate and pitch for children's stories
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    // Handle end of speech
    utterance.onend = () => {
      setSpeakingIndex(null);
    };
    
    // Handle errors
    utterance.onerror = () => {
      setSpeakingIndex(null);
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
  };

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-grow mb-6 bg-card rounded-xl shadow-md border border-border p-2 overflow-y-auto"
      style={{ maxHeight: "60vh", minHeight: "300px" }}
    >
      <div className="space-y-4 p-2">
        {messages.length === 0 && (
          <div className="flex items-start">
            <Avatar className="w-8 h-8 bg-primary">
              <FaRobot className="text-sm text-white" />
            </Avatar>
            <div className="ml-3 bg-primary bg-opacity-10 rounded-lg rounded-tl-none p-3 max-w-[85%]">
              <p className="text-sm font-nunito">
                Hello! I'm SolanaStories, a storytelling bot for children ages 5-10. 
                I can create fun adventures that teach Solana blockchain concepts through magical tales! 
                What kind of story would you like for your child today?
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div 
            key={index}
            className={`flex items-start ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "assistant" && (
              <Avatar className="w-8 h-8 bg-primary">
                <FaRobot className="text-sm text-white" />
              </Avatar>
            )}
            
            <div 
              className={`${
                message.role === "assistant" 
                  ? "ml-3 bg-primary bg-opacity-10 rounded-lg rounded-tl-none" 
                  : "mr-3 bg-secondary bg-opacity-10 rounded-lg rounded-tr-none"
              } p-3 max-w-[85%] relative group`}
            >
              {message.role === "assistant" && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => speak(message.content, index)}
                    variant="outline"
                    size="sm"
                    className={`h-8 w-8 p-0 rounded-full bg-primary bg-opacity-10 hover:bg-opacity-20 border-primary border-opacity-20 ${speakingIndex === index ? 'speaking-active' : ''}`}
                    title={speakingIndex === index ? "Stop narration" : "Narrate story"}
                  >
                    {speakingIndex === index ? (
                      <VolumeX className="h-4 w-4 text-primary" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </div>
              )}
              
              {message.role === "assistant" && message.content.includes("\n\n") ? (
                <>
                  {message.content.split("\n\n").map((paragraph, idx) => {
                    // Check if this paragraph is a title (first paragraph and short)
                    const isTitle = idx === 0 && paragraph.length < 100;
                    
                    return (
                      <p 
                        key={idx} 
                        className={`text-sm font-nunito ${
                          isTitle ? "font-semibold mb-2" : "mt-2"
                        } ${idx === 0 ? "" : "mt-2"}`}
                      >
                        {paragraph}
                      </p>
                    );
                  })}
                </>
              ) : (
                <p className="text-sm font-nunito">{message.content}</p>
              )}
            </div>
            
            {message.role === "user" && (
              <Avatar className="w-8 h-8 bg-secondary">
                <FaUser className="text-sm text-white" />
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <Avatar className="w-8 h-8 bg-primary">
              <FaRobot className="text-sm text-white" />
            </Avatar>
            <div className="ml-3 bg-primary bg-opacity-10 rounded-lg rounded-tl-none p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ChatHistory;
