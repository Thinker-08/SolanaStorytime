import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";

// Handle browsers that don't support Web Speech API
if (typeof window !== 'undefined' && !window.speechSynthesis) {
  console.warn("Speech synthesis not supported by this browser. Adding a mock implementation.");
  
  // Create a basic mock implementation
  window.speechSynthesis = {
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null,
    
    getVoices: () => [],
    speak: () => console.log("Mock speech synthesis: speak called"),
    cancel: () => console.log("Mock speech synthesis: cancel called"),
    pause: () => console.log("Mock speech synthesis: pause called"),
    resume: () => console.log("Mock speech synthesis: resume called"),
    addEventListener: (type: string, listener: EventListener) => {
      console.log(`Mock speech synthesis: added ${type} listener`);
      // If it's a voiceschanged event, fire it immediately
      if (type === 'voiceschanged') {
        try {
          listener(new Event('voiceschanged'));
        } catch (e) {
          console.error("Error in voiceschanged listener:", e);
        }
      }
    },
    removeEventListener: () => console.log("Mock speech synthesis: removed listener"),
  } as unknown as SpeechSynthesis;
  
  window.SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
    text: string;
    lang: string = 'en-US';
    voice: SpeechSynthesisVoice | null = null;
    volume: number = 1;
    rate: number = 1;
    pitch: number = 1;
    onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    onboundary: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    onmark: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
    
    constructor(text: string) {
      this.text = text;
      console.log("Mock SpeechSynthesisUtterance created with text:", text.substring(0, 50) + "...");
    }
  } as any;
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
