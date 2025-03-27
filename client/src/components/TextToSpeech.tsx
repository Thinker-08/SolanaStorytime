import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Pause } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TextToSpeechProps {
  text: string;
  isVisible: boolean;
}

const TextToSpeech = ({ text, isVisible }: TextToSpeechProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Get available voices
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
      
      updateVoices();
    } else {
      setIsSupported(false);
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Create a new utterance when text changes
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    const newUtterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a child-friendly, female voice
    const preferredVoice = voices.find(
      voice => 
        (voice.name.includes("female") || 
         voice.name.includes("girl") || 
         voice.name.includes("Female") ||
         voice.name.toLowerCase().includes("samantha")) && 
        voice.lang.includes("en")
    );
    
    if (preferredVoice) {
      newUtterance.voice = preferredVoice;
    }
    
    // Set moderate rate and pitch - suitable for children's stories
    newUtterance.rate = 0.9;
    newUtterance.pitch = 1.1;
    
    newUtterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    setUtterance(newUtterance);
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [text, voices]);

  const toggleSpeech = () => {
    if (!utterance || !window.speechSynthesis) return;

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  if (!isSupported || !isVisible) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleSpeech}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full bg-primary bg-opacity-10 hover:bg-opacity-20 border-primary border-opacity-20"
            >
              {isSpeaking && !isPaused ? (
                <Pause className="h-4 w-4 text-primary" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isSpeaking ? (isPaused ? "Resume story" : "Pause story") : "Read story aloud"}</p>
          </TooltipContent>
        </Tooltip>

        {isSpeaking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={stopSpeech}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-full bg-destructive bg-opacity-10 hover:bg-opacity-20 border-destructive border-opacity-20"
              >
                <VolumeX className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop reading</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TextToSpeech;