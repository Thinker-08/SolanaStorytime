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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioSupported, setAudioSupported] = useState<boolean>(false);
  
  // Initialize speech synthesis
  useEffect(() => {
    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
      console.error("CRITICAL: Speech synthesis not supported in this browser");
      return;
    }
    
    // Test audio with a simple utterance
    const testAudio = () => {
      try {
        // Create a short test utterance that won't be noticed by users
        const testUtterance = new SpeechSynthesisUtterance("test");
        testUtterance.volume = 0; // Mute it
        testUtterance.onend = () => {
          console.log("🎉 Audio test successful - speech synthesis appears to be working");
          setAudioSupported(true);
        };
        testUtterance.onerror = (e) => {
          console.error("❌ Audio test failed - speech synthesis error:", e);
          setAudioSupported(false);
        };
        
        // Speak the test utterance
        window.speechSynthesis.speak(testUtterance);
      } catch (error) {
        console.error("❌ Could not test audio:", error);
        setAudioSupported(false);
      }
    };
    
    // Function to handle voices changed event
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("Voices loaded:", voices.length);
      setAvailableVoices(voices);
      setVoicesLoaded(voices.length > 0);
      
      // Test audio after voices load
      if (voices.length > 0) {
        testAudio();
      }
    };
    
    // Try to force voices to load
    window.speechSynthesis.cancel();
    
    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log("Voices already loaded:", voices.length);
      setAvailableVoices(voices);
      setVoicesLoaded(true);
      
      // Test audio immediately if voices are already loaded
      testAudio();
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
        
        // Test audio after delayed voice loading
        testAudio();
      }
    }, 1000);
    
    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [voicesLoaded]);

  // Text-to-speech functionality
  const speak = (text: string, index: number) => {
    console.log("Starting text-to-speech...");
    
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported in this browser");
      alert("Sorry, text-to-speech is not supported in your browser.");
      return;
    }
    
    // If we know audio isn't supported (from our earlier test), notify the user
    if (!audioSupported && voicesLoaded) {
      console.warn("Audio was previously detected as unsupported in this browser");
      alert("Speech synthesis appears to be blocked or unsupported in your browser.\n\nTry checking your browser settings to ensure audio is allowed on this site.");
      return;
    }
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    if (speakingIndex === index) {
      console.log("Stopping speech");
      setSpeakingIndex(null);
      return;
    }
    
    try {
      // Try a quick audio test before continuing
      if (!audioSupported) {
        console.log("Attempting to verify audio support before speaking...");
        
        // We'll still try to speak anyway, but log this for troubleshooting
        const silentTest = new SpeechSynthesisUtterance(".");
        silentTest.volume = 0;
        silentTest.onend = () => console.log("Silent audio check passed");
        silentTest.onerror = () => console.warn("Silent audio check failed");
        window.speechSynthesis.speak(silentTest);
      }
      
      // For Replit environment and browsers that have issues with long text
      // Break up the text into smaller chunks to improve reliability
      const textChunks = splitTextIntoChunks(text, 200); // Split into chunks of 200 characters
      console.log(`Text split into ${textChunks.length} chunks`);
      
      // Set the speaking state now to provide immediate feedback to the user
      setSpeakingIndex(index);
      
      // Process the first chunk immediately
      processTextChunk(textChunks, 0, index);
    } catch (error) {
      console.error("Error in speech synthesis:", error);
      setSpeakingIndex(null);
      alert("Sorry, there was an error with text-to-speech. Please try again.");
    }
  };
  
  // Function to split text into smaller chunks for better TTS performance
  const splitTextIntoChunks = (text: string, chunkSize: number): string[] => {
    const chunks: string[] = [];
    
    // Split by sentences first
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = "";
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize) {
        // If adding this sentence would exceed chunk size, save current chunk and start a new one
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        
        // If sentence itself is longer than chunk size, split it further
        if (sentence.length > chunkSize) {
          const words = sentence.split(" ");
          let tempChunk = "";
          
          for (const word of words) {
            if ((tempChunk + " " + word).length > chunkSize) {
              chunks.push(tempChunk);
              tempChunk = word;
            } else {
              tempChunk += (tempChunk ? " " : "") + word;
            }
          }
          
          if (tempChunk) {
            currentChunk = tempChunk;
          }
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }
    
    // Add any remaining text
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  };
  
  // Process text chunks one by one
  const processTextChunk = (chunks: string[], index: number, messageIndex: number) => {
    // Stop if we've reached the end or speaking has been stopped
    if (index >= chunks.length || speakingIndex !== messageIndex) {
      if (index >= chunks.length) {
        console.log("Finished speaking all chunks");
        setSpeakingIndex(null);
      }
      return;
    }
    
    const chunk = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunk);
    
    // Use our cached voices if available
    const voices = availableVoices.length > 0 
      ? availableVoices 
      : window.speechSynthesis.getVoices();
      
    // First try to find a good English voice
    let preferredVoice = voices.find(
      voice => 
        (voice.name.includes("female") || 
         voice.name.includes("girl") || 
         voice.name.includes("Female") ||
         voice.name.toLowerCase().includes("samantha")) && 
        voice.lang.includes("en")
    );
    
    // If no preferred voice found, try any English voice
    if (!preferredVoice) {
      preferredVoice = voices.find(voice => voice.lang.includes("en"));
    }
    
    // If still no voice, use the first voice or default
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Set moderate rate and pitch for children's stories
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    // When this chunk ends, process the next one
    utterance.onend = () => {
      processTextChunk(chunks, index + 1, messageIndex);
    };
    
    // Handle errors
    utterance.onerror = (event) => {
      console.error("Speech synthesis error for chunk:", event);
      // Try to continue with next chunk despite error
      processTextChunk(chunks, index + 1, messageIndex);
    };
    
    // Ensure browser compatibility with a small delay
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
        console.log(`Speaking chunk ${index + 1} of ${chunks.length}`);
      } catch (error) {
        console.error("Error starting speech:", error);
        // Try the next chunk anyway
        processTextChunk(chunks, index + 1, messageIndex);
      }
    }, 50);
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
              {/* No conditional rendering here - removed */}
              
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
