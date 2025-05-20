import { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Volume2, VolumeX, Pause } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

interface TextToSpeechProps {
  text: string;
  isVisible: boolean;
}

export default function TextToSpeech({ text, isVisible }: TextToSpeechProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  // Track if current playback is via API audio
  const [isUsingApi, setIsUsingApi] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      setIsSupported(false);
      return;
    }
    const update = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = update;
    update();
    return () => window.speechSynthesis.cancel();
  }, []);

  // Prepare utterance on text/voices change
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    const pref = voices.find(v =>
      /female|girl|samantha/i.test(v.name) && v.lang.startsWith("en")
    );
    if (pref) u.voice = pref;
    u.rate = 0.9;
    u.pitch = 1.1;
    u.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setIsUsingApi(false);
    };
    setUtterance(u);
    return () => window.speechSynthesis.cancel();
  }, [text, voices]);

  // Stop everything
  const stopSpeech = () => {
    if (isUsingApi) {
      audioRef.current?.pause();
      if (audioRef.current?.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    } else {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setIsUsingApi(false);
  };

  // Toggle: either start or pause/resume
  const toggleSpeech = async () => {
    if (!isSpeaking) {
      // Start new playback
      setIsSpeaking(true);
      setIsPaused(false);

      try {
        // Try API
        const resp = await fetch("https://solana-storytime.vercel.app/api/text-to-speech-speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!resp.ok || !resp.headers.get("content-type")?.includes("audio")) {
          throw new Error("No audio");
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        audioRef.current!.src = url;
        setIsUsingApi(true);
        await audioRef.current!.play();
        audioRef.current!.onended = () => stopSpeech();
        return;
      } catch (e) {
        // Fallback to browser TTS
        setIsUsingApi(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance!);
      }
    } else {
      // Already speaking → pause/resume if browser TTS, or stop if API
      if (isUsingApi) {
        stopSpeech();
      } else {
        if (isPaused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
        }
      }
    }
  };

  if (!isSupported || !isVisible) return null;

  const { label, icon } = !isSpeaking
    ? { label: "Listen", icon: <Volume2 className="h-4 w-4 mr-1" /> }
    : isUsingApi
      ? { label: "Stop", icon: <VolumeX className="h-4 w-4 mr-1" /> }
      : isPaused
        ? { label: "Resume", icon: <Volume2 className="h-4 w-4 mr-1" /> }
        : { label: "Pause", icon: <Pause className="h-4 w-4 mr-1" /> };

  return (
    <TooltipProvider>
      <audio ref={audioRef} hidden />
        <Tooltip >
          <TooltipTrigger asChild>
            <Button
              onClick={toggleSpeech}
              variant="outline"
              className="flex-1 py-3 bg-violet-400 hover:bg-violet-500 text-white font-bold rounded-lg shadow border-none h-11.5"
            >
              {icon}
              <span>{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>

        {/* Show a dedicated Stop when using browser TTS */}
        {isSpeaking && !isUsingApi && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={stopSpeech}
                variant="outline"
                className="flex-1 py-3 bg-violet-400 hover:bg-red-800 text-white font-bold rounded-lg shadow border-none h-11.5 bg-destructive"
              >
                <VolumeX className="h-4 w-4" />
                <span className="text-xs text-white">Stop</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop</p>
            </TooltipContent>
          </Tooltip>
        )}
    </TooltipProvider>
  );
}
