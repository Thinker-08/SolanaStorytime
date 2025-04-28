import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useToast } from "../hooks/use-toast";

type SpeechComponentProps = {
  text: string;
  label?: string;
};

// Utility to split long text into chunks for better speech handling
const splitTextIntoChunks = (text: string): string[] => {
  const maxChunkLength = 200;
  const chunks: string[] = [];
  const cleanedText = text.replace(/\*\*/g, "").replace(/\n---\n/g, " ").replace(/#{1,6}\s/g, "");
  const sentences = cleanedText.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkLength) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

export default function SpeechComponent({ text, label }: SpeechComponentProps) {
  const [speaking, setSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();
  const audioElement = React.useRef<HTMLAudioElement>(new Audio()).current;

  // Load voices once
  useEffect(() => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) setAvailableVoices(voices);
    else {
      window.speechSynthesis.onvoiceschanged = () => {
        setAvailableVoices(window.speechSynthesis.getVoices());
      };
    }
  }, []);

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    audioElement.pause();
    audioElement.currentTime = 0;
    setSpeaking(false);
  };

  const speak = async () => {
    if (speaking) {
      stopSpeech();
      return;
    }
    setSpeaking(true);
    toast({ title: "Speech started", description: "Reading the text aloud." });

    const chunks = splitTextIntoChunks(text);

    const speakChunks = (idx: number) => {
      if (idx >= chunks.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[idx]);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      const voice = availableVoices.find(v => v.lang === "en-US") || availableVoices[0];
      if (voice) utterance.voice = voice;
      utterance.onend = () => setTimeout(() => speakChunks(idx + 1), 300);
      utterance.onerror = () => speakChunks(idx + 1);
      window.speechSynthesis.speak(utterance);
    };

    try {
      speakChunks(0);
    } catch (e) {
      console.error("Speech synthesis failed, attempting audio fallback", e);
      stopSpeech();
    }
  };

  return (
    <Button onClick={speak} variant="outline" size="sm">
      {speaking ? <><VolumeX className="h-4 w-4 mr-1"/> Stop</> : <><Volume2 className="h-4 w-4 mr-1"/> {label || "Listen"}</>}
    </Button>
  );
}