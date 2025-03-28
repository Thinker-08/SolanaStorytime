import { useRef, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaRobot, FaUser } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Initialize speech synthesis and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.error("Speech synthesis not supported in this browser");
      return;
    }
    
    // Function to handle voices changed event
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("Voices loaded:", voices.length);
      setAvailableVoices(voices);
      setVoicesLoaded(voices.length > 0);
    };
    
    // Force cleanup of any ongoing speech
    window.speechSynthesis.cancel();
    
    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log("Voices already loaded:", voices.length);
      setAvailableVoices(voices);
      setVoicesLoaded(true);
    }
    
    // Add event listener for voices changed
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    
    // Try additional method to load voices in some browsers
    setTimeout(() => {
      const delayedVoices = window.speechSynthesis.getVoices();
      if (delayedVoices.length > 0 && !voicesLoaded) {
        console.log("Delayed voices loaded:", delayedVoices.length);
        setAvailableVoices(delayedVoices);
        setVoicesLoaded(true);
      }
    }, 1000);
    
    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, [voicesLoaded]);

  // Fix for Chrome bug where speech stops after ~15 seconds
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    const intervalId = setInterval(() => {
      if (speakingIndex !== null) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    
    return () => {
      clearInterval(intervalId);
      window.speechSynthesis.cancel();
    };
  }, [speakingIndex]);

  // Function to split long text into chunks for better speech synthesis
  const splitTextIntoChunks = (text: string): string[] => {
    const maxChunkLength = 200;
    const chunks: string[] = [];
    
    // Clean up text by removing markdown
    const cleanedText = text
      .replace(/\*\*/g, '')
      .replace(/\n---\n/g, ' ')
      .replace(/#{1,6}\s/g, '');
    
    // Split by sentences
    const sentences = cleanedText.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    console.log(`Split text into ${chunks.length} chunks for speech`);
    return chunks;
  };

  // Process and speak text chunks one by one
  const speakTextChunks = (chunks: string[], index = 0, messageIndex: number) => {
    if (index >= chunks.length || speakingIndex !== messageIndex) {
      if (index >= chunks.length) {
        console.log("Finished speaking all chunks");
        setSpeakingIndex(null);
      }
      return;
    }
    
    const chunk = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunk);
    
    // Set voice properties
    utterance.volume = 1.0;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    // Find a good voice
    const voices = availableVoices.length > 0 
      ? availableVoices 
      : window.speechSynthesis.getVoices();
    
    // Try to find an English female voice first
    const bestVoice = voices.find(voice => 
      voice.lang === 'en-US' && 
      (voice.name.includes('female') || voice.name.includes('Female'))
    ) || voices.find(voice => 
      voice.lang.startsWith('en')
    );
    
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    // When chunk completes, speak the next one
    utterance.onend = () => {
      console.log(`Chunk ${index + 1}/${chunks.length} complete`);
      // Add a small delay between chunks for more natural pauses
      setTimeout(() => {
        speakTextChunks(chunks, index + 1, messageIndex);
      }, 300);
    };
    
    // Handle errors
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      // Try next chunk despite error
      setTimeout(() => {
        speakTextChunks(chunks, index + 1, messageIndex);
      }, 500);
    };
    
    console.log(`Speaking chunk ${index + 1}/${chunks.length}`);
    window.speechSynthesis.speak(utterance);
  };

  // Main function to start or stop speech synthesis
  const speak = (text: string, index: number) => {
    console.log("Text-to-speech requested");
    
    // If already speaking this message, stop it
    if (speakingIndex === index) {
      console.log("Stopping speech");
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    
    try {
      // Clean up the text
      const cleanedText = text
        .replace(/\*\*/g, '')
        .replace(/\n---\n/g, ' ')
        .replace(/#{1,6}\s/g, '');
      
      // Set speaking state for UI feedback
      setSpeakingIndex(index);
      
      // Show toast notification
      toast({
        title: "Story narration starting",
        description: "The story will be read aloud now. Click 'Stop' to end narration.",
      });
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Request the text to speak from the server
      fetch('/api/text-to-speech/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server response error: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("Server processed text:", data);
          
          // Get the processed text and speech settings
          const textToSpeak = data.text || cleanedText;
          
          // For long text, split into chunks and speak sequentially
          if (textToSpeak.length > 200) {
            const chunks = splitTextIntoChunks(textToSpeak);
            speakTextChunks(chunks, 0, index);
          } else {
            // For short text, speak directly
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            
            // Apply speech settings
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 1.0;
            
            // Find a good voice
            const voices = availableVoices.length > 0 
              ? availableVoices 
              : window.speechSynthesis.getVoices();
            
            const bestVoice = voices.find(voice => 
              voice.lang === 'en-US' && 
              (voice.name.includes('female') || voice.name.includes('Female'))
            ) || voices.find(voice => 
              voice.lang.startsWith('en')
            );
            
            if (bestVoice) {
              utterance.voice = bestVoice;
            }
            
            // Set up completion handler
            utterance.onend = () => {
              console.log("Speech completed");
              setSpeakingIndex(null);
            };
            
            utterance.onerror = (event) => {
              console.error("Speech synthesis error:", event);
              setSpeakingIndex(null);
            };
            
            // Start speaking
            window.speechSynthesis.speak(utterance);
          }
        })
        .catch(error => {
          console.error("Error with text-to-speech:", error);
          
          // Fallback: try direct browser synthesis
          try {
            const fallbackUtterance = new SpeechSynthesisUtterance(cleanedText);
            fallbackUtterance.volume = 1.0;
            fallbackUtterance.rate = 0.9;
            
            fallbackUtterance.onend = () => {
              setSpeakingIndex(null);
            };
            
            window.speechSynthesis.speak(fallbackUtterance);
          } catch (speechError) {
            console.error("Browser speech synthesis failed:", speechError);
            setSpeakingIndex(null);
            
            toast({
              title: "Speech error",
              description: "There was an error starting the narration. Please try again.",
              variant: "destructive"
            });
          }
        });
    } catch (error) {
      console.error("Error initializing speech:", error);
      setSpeakingIndex(null);
      
      toast({
        title: "Speech error",
        description: "There was an error starting the narration. Please try again.",
        variant: "destructive"
      });
    }
  };

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
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-primary">Story from SolanaStories</h3>
                  <Button
                    onClick={() => speak(message.content, index)}
                    variant="outline"
                    size="sm"
                    className={`h-8 px-3 py-1 rounded-md ${speakingIndex === index ? 'speaking-active' : 'bg-primary text-white hover:bg-opacity-90'} border-none shadow-md`}
                  >
                    {speakingIndex === index ? (
                      <div className="flex items-center">
                        <VolumeX className="h-4 w-4 mr-1" />
                        <span>Stop</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Volume2 className="h-4 w-4 mr-1" />
                        <span>Listen</span>
                      </div>
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
                      <div 
                        key={idx} 
                        className={`${
                          isTitle ? "text-lg font-bold mb-4" : "text-sm font-nunito"
                        } ${idx === 0 ? "" : "mt-2"}`}
                      >
                        {paragraph}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-sm font-nunito">{message.content}</p>
              )}
              
              {message.role === "user" && (
                <div className="flex justify-end mb-1">
                  <Avatar className="w-6 h-6 bg-secondary ml-2">
                    <FaUser className="text-xs text-white" />
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start">
            <Avatar className="w-8 h-8 bg-primary">
              <FaRobot className="text-sm text-white" />
            </Avatar>
            <div className="ml-3 bg-primary bg-opacity-10 rounded-lg rounded-tl-none p-4 max-w-[85%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ChatHistory;