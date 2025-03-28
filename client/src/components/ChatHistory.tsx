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

// Create a cross-browser compatible service for Text-to-Speech
class SpeechService {
  private static instance: SpeechService;
  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;
  private isSpeaking: boolean = false;
  private isClientSpeechSynthesisWorking: boolean = true; // Optimistic by default
  
  private constructor() {
    if (typeof window !== 'undefined') {
      // Initialize speech synthesis
      this.synth = window.speechSynthesis;
      
      // Initialize audio element for fallback TTS via server
      this.audioElement = new Audio();
      
      // Set up audio element event listeners
      this.audioElement.addEventListener('ended', () => {
        this.isSpeaking = false;
        if (this.onEndCallback) {
          this.onEndCallback();
          this.onEndCallback = null;
        }
      });
      
      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio element error:', e);
        this.isSpeaking = false;
        if (this.onEndCallback) {
          this.onEndCallback();
          this.onEndCallback = null;
        }
      });
      
      // Test if speech synthesis actually works
      this.testSpeechSynthesis();
    }
  }
  
  // Test if client-side speech synthesis actually works
  private testSpeechSynthesis(): void {
    if (!this.synth) {
      console.warn("Speech synthesis not available in this browser");
      this.isClientSpeechSynthesisWorking = false;
      return;
    }
    
    // Create a silent test utterance
    try {
      const testUtterance = new SpeechSynthesisUtterance("test");
      testUtterance.volume = 0; // Silent test
      
      testUtterance.onend = () => {
        console.log("🎉 Audio test successful - speech synthesis appears to be working");
        this.isClientSpeechSynthesisWorking = true;
      };
      
      testUtterance.onerror = (event) => {
        console.error("❌ Audio test failed - speech synthesis error:", event);
        this.isClientSpeechSynthesisWorking = false;
      };
      
      // Fire the test
      this.synth.speak(testUtterance);
    } catch (error) {
      console.error("❌ Speech synthesis test exception:", error);
      this.isClientSpeechSynthesisWorking = false;
    }
  }
  
  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }
  
  public speak(text: string, onEnd?: () => void): void {
    // Stop any current speech
    this.stopSpeaking();
    
    // Save callback
    this.onEndCallback = onEnd || null;
    
    if (!text) return;
    
    this.isSpeaking = true;
    
    // If client speech synthesis is working and not running in Chrome, use it
    // Chrome has issues with longer texts, so we'll just use server-side for it
    if (this.isClientSpeechSynthesisWorking && !this.isChrome()) {
      try {
        // Create and configure utterance
        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.rate = 0.9;  // Slightly slower for better comprehension
        this.utterance.pitch = 1.1; // Slightly higher for children's stories
        this.utterance.volume = 1.0;
        
        // Find an appropriate voice
        const voices = this.synth?.getVoices() || [];
        
        // First try to find female English voice (best for children's stories)
        const englishVoice = voices.find(voice => 
          voice.lang.includes('en') && 
          (voice.name.includes('female') || 
           voice.name.includes('Female') || 
           voice.name.includes('Samantha'))
        ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
        
        if (englishVoice) {
          this.utterance.voice = englishVoice;
        }
        
        // Set up callbacks
        this.utterance.onend = () => {
          this.isSpeaking = false;
          if (this.onEndCallback) {
            this.onEndCallback();
            this.onEndCallback = null;
          }
        };
        
        // Handle errors by falling back to server TTS
        this.utterance.onerror = (e) => {
          console.error('Speech synthesis error:', e);
          this.useServerTTS(text);
        };
        
        // Start speaking
        this.synth?.speak(this.utterance);
      } catch (error) {
        console.error('Speech synthesis failed:', error);
        // Fall back to server TTS
        this.useServerTTS(text);
      }
    } else {
      // Use server TTS directly if client TTS isn't working or we're in Chrome
      this.useServerTTS(text);
    }
  }
  
  private useServerTTS(text: string): void {
    if (!this.audioElement) return;
    
    console.log("Using server-side text-to-speech API");
    
    // Create a new Audio element for each request to avoid issues with reusing
    this.audioElement = new Audio();
    
    // Set up event listeners
    this.audioElement.addEventListener('ended', () => {
      console.log("Audio playback ended");
      this.isSpeaking = false;
      if (this.onEndCallback) {
        this.onEndCallback();
        this.onEndCallback = null;
      }
    });
    
    this.audioElement.addEventListener('error', (e) => {
      console.error("Audio element error:", e);
      this.isSpeaking = false;
      if (this.onEndCallback) {
        this.onEndCallback();
        this.onEndCallback = null;
      }
    });
    
    // Create FormData for the request (this can help with binary responses)
    const formData = new FormData();
    formData.append('text', text);
    
    // Trick to ensure cross-browser compatibility: pre-unlock audio
    // Some browsers require user interaction before audio can play
    const unlockAudio = () => {
      // Create and play a silent sound
      const silentSound = new Audio();
      silentSound.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      
      silentSound.play().catch(e => {
        console.warn("Failed to unlock audio with silent sound:", e);
      });
      
      // Also try to unlock with a gesture on the document
      document.addEventListener('click', function unlockClick() {
        silentSound.play().catch(() => {});
        document.removeEventListener('click', unlockClick);
      }, { once: true });
    };
    
    // Try to unlock audio
    unlockAudio();
    
    // Make a fetch request for the audio
    fetch('/api/text-to-speech/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav,audio/*;q=0.9',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ text }),
    })
      .then(response => {
        if (!response.ok) {
          console.error('Server returned error status:', response.status);
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.blob();
      })
      .then(audioBlob => {
        // For debugging
        console.log(`Received audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        if (audioBlob.size === 0) {
          throw new Error('Empty audio blob received from server');
        }
        
        // Ensure we have a supported audio MIME type or use a sensible default
        const audioType = audioBlob.type || 'audio/wav';
        
        // Convert the blob to a URL
        const audioUrl = URL.createObjectURL(
          // Ensure correct MIME type if server doesn't provide it
          new Blob([audioBlob], { type: audioType })
        );
        
        if (!this.audioElement) {
          this.audioElement = new Audio();
        }
        
        // Set the source
        this.audioElement.src = audioUrl;
        
        // Clean up the URL when the audio is done
        this.audioElement.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          if (this.onEndCallback) {
            this.onEndCallback();
            this.onEndCallback = null;
          }
        };
        
        // Attempt to play with error handling
        return this.audioElement.play()
          .catch(err => {
            console.error("Error playing audio:", err);
            
            // Special handling for NotAllowedError which often means user interaction is required
            if (err.name === 'NotAllowedError') {
              alert("Please click OK to enable audio for story narration.");
              
              // Try again after the alert (which counts as user interaction)
              return this.audioElement?.play();
            }
            
            throw err; // Re-throw other errors
          });
      })
      .catch(error => {
        console.error('Error with text-to-speech:', error);
        
        // Try direct browser speech synthesis as a last resort
        if (window.speechSynthesis) {
          try {
            const fallbackUtterance = new SpeechSynthesisUtterance(text);
            fallbackUtterance.volume = 1.0;
            fallbackUtterance.rate = 0.9;
            
            if (this.onEndCallback) {
              fallbackUtterance.onend = this.onEndCallback;
            }
            
            window.speechSynthesis.speak(fallbackUtterance);
            console.log("Using direct browser speech synthesis as fallback");
          } catch (speechError) {
            console.error("Even browser speech synthesis failed:", speechError);
          }
        }
        
        // Clean up regardless of what happened
        this.isSpeaking = false;
        if (this.onEndCallback) {
          this.onEndCallback();
          this.onEndCallback = null;
        }
      });
  }
  
  public stopSpeaking(): void {
    this.isSpeaking = false;
    
    // Stop any client-side speech synthesis
    if (this.synth) {
      this.synth.cancel();
    }
    
    // Stop any audio playback
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    
    // Reset state
    this.utterance = null;
    this.onEndCallback = null;
  }
  
  public isChrome(): boolean {
    return typeof window !== 'undefined' && 
           navigator.userAgent.indexOf('Chrome') !== -1 &&
           navigator.userAgent.indexOf('Edge') === -1; // Not Edge
  }
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
  const [audioSupported, setAudioSupported] = useState<boolean>(false);
  const audioContext = useRef<AudioContext | null>(null);
  
  // Initialize speech synthesis
  useEffect(() => {
    // Check if speech synthesis is supported
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.error("CRITICAL: Speech synthesis not supported in this browser");
      return;
    }
    
    // Create AudioContext for unlocking audio on iOS/Safari
    try {
      // @ts-ignore - AudioContext might not be available in all browsers
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContext.current = new AudioContext();
      }
    } catch (e) {
      console.warn("AudioContext not supported:", e);
    }
    
    // Helper function to unlock audio on iOS/Safari
    const unlockAudio = () => {
      if (audioContext.current && audioContext.current.state === 'suspended') {
        audioContext.current.resume().then(() => {
          console.log("AudioContext resumed successfully");
        }).catch(err => {
          console.error("Failed to resume AudioContext:", err);
        });
      }
      
      // Create and play a silent sound to unlock the audio
      if (window.speechSynthesis) {
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0.01; // Nearly silent but not completely
        window.speechSynthesis.speak(unlockUtterance);
      }
      
      // Remove the listeners after first interaction
      document.body.removeEventListener('click', unlockAudio);
      document.body.removeEventListener('touchstart', unlockAudio);
    };
    
    // Add event listeners to unlock audio on first user interaction
    document.body.addEventListener('click', unlockAudio);
    document.body.addEventListener('touchstart', unlockAudio);
    
    // Test audio with a simple utterance
    const testAudio = () => {
      try {
        // Ensure speech synthesis is not busy
        window.speechSynthesis.cancel();
        
        // Create a short test utterance that won't be noticed by users
        const testUtterance = new SpeechSynthesisUtterance("test");
        testUtterance.volume = 0.1; // Very quiet but not silent (silent can fail on some browsers)
        testUtterance.rate = 1.0;
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
    
    // Force cleanup of any ongoing speech
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
      document.body.removeEventListener('click', unlockAudio);
      document.body.removeEventListener('touchstart', unlockAudio);
      window.speechSynthesis.cancel();
    };
  }, [voicesLoaded]);

  // Text-to-speech functionality using our SpeechService
  const speak = (text: string, index: number) => {
    console.log("Starting text-to-speech with SpeechService...");
    
    // If already speaking this message, stop it
    if (speakingIndex === index) {
      console.log("Stopping speech");
      SpeechService.getInstance().stopSpeaking();
      setSpeakingIndex(null);
      return;
    }
    
    try {
      // Clean up the text by removing markdown
      const cleanedText = text
        .replace(/\*\*/g, '')  // Remove bold markdown
        .replace(/\n---\n/g, ' ') // Remove horizontal rules
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
      
      // Set the speaking state now to provide immediate feedback to the user
      setSpeakingIndex(index);
      
      // Show a toast notification to indicate that speech is starting
      toast({
        title: "Story narration starting",
        description: "The story will be read aloud now. Click 'Stop' to end narration.",
      });
      
      // Use the SpeechService to speak
      SpeechService.getInstance().speak(cleanedText, () => {
        console.log("Speech complete");
        setSpeakingIndex(null);
      });
    } catch (error) {
      console.error("Error in speech synthesis:", error);
      setSpeakingIndex(null);
      toast({
        title: "Speech error",
        description: "There was an error starting the narration. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to split text into smaller chunks for better TTS performance
  const splitTextIntoChunks = (text: string, chunkSize: number): string[] => {
    const chunks: string[] = [];
    
    // Remove any special characters or markdown that might confuse speech synthesis
    const cleanedText = text
      .replace(/\*\*/g, '')  // Remove bold markdown
      .replace(/\n---\n/g, ' ') // Remove horizontal rules
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      
    // Split by sentences first for more natural pauses
    const sentences = cleanedText.split(/(?<=[.!?])\s+/);
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
    
    // Important for mobile Safari: set these properties before setting voice
    utterance.volume = 1.0;  // Full volume
    utterance.rate = 0.9;    // Slightly slower
    utterance.pitch = 1.1;   // Slightly higher pitch
    
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
    
    // If still no voice, use the first voice available
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }
    
    // When this chunk ends, process the next one
    utterance.onend = () => {
      // Add a small delay between chunks for more natural pauses
      setTimeout(() => {
        processTextChunk(chunks, index + 1, messageIndex);
      }, 300);
    };
    
    // Handle errors
    utterance.onerror = (event) => {
      console.error("Speech synthesis error for chunk:", event);
      // Try to continue with next chunk despite error
      setTimeout(() => {
        processTextChunk(chunks, index + 1, messageIndex);
      }, 500);
    };
    
    // Ensure browser compatibility with a small delay
    setTimeout(() => {
      try {
        // Chrome/Firefox sometimes need this to be called again
        if (audioContext.current && audioContext.current.state === 'suspended') {
          audioContext.current.resume();
        }
        
        window.speechSynthesis.speak(utterance);
        console.log(`Speaking chunk ${index + 1} of ${chunks.length}`);
      } catch (error) {
        console.error("Error starting speech:", error);
        // Try the next chunk anyway
        processTextChunk(chunks, index + 1, messageIndex);
      }
    }, 100);
  };

  // Reset speech synthesis on Chrome bug (stops after ~15 seconds)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    // Chrome bug fix: speech stops after about 15 seconds
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
