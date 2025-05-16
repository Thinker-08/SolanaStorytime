import { useRef, useEffect, useState } from "react";
import { Avatar } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Button } from "../components/ui/button";
import { Volume2, VolumeX, BookOpen } from "lucide-react";
import TextToSpeech from "./TextToSpeech";
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
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-grow mb-6 p-2 overflow-y-auto bg-transparent"
      style={{ maxHeight: "60vh", minHeight: "300px" }}
    >
      <div className="space-y-4 p-2">
        {messages.length === 0 && (
          <div className="flex items-start">
              <Avatar className="w-8 h-8 bg-primary justify-center">
                <BookOpen className="text-sm text-white pt-2" size={24}/>
              </Avatar>
            <div className="ml-3 bg-white rounded-lg rounded-tl-none p-3 max-w-[85%]">
            <p className="text-black font-medium font-nunito">
              Hello! I'm SoulStories, a storytelling bot for children ages 5-10. 
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
              <Avatar className="w-8 h-8 bg-violet-400 justify-center">
                <BookOpen className="text-sm text-white pt-2" size={24}/>
              </Avatar>
            )}
            
            <div 
              className={`${
                message.role === "assistant" 
                  ? "ml-3 bg-white rounded-lg rounded-tl-none text-black font-thin" 
                  : "mr-3 rounded-lg rounded-tr-none bg-violet-400"
              } p-3 max-w-[85%] relative group`}
            > 
              {message.role === "assistant" && message.content.includes("\n\n") ? (
            <>
              {message.content.split("\n\n").map((paragraph, idx) => {
                const isTitle = idx === 0 && paragraph.length < 100;
                
                return (
                  <div 
                    key={idx} 
                    className={`${
                      isTitle 
                        ? "font-medium mb-4" 
                        : "font-medium font-nunito"
                    } ${idx === 0 ? "" : "mt-2"}`}
                  >
                    {paragraph}
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-base font-medium font-nunito">{message.content}</p>
          )}
                        {message.role === "assistant" && (
                <div className="flex justify-between items-center mb-3 pt-2">

                  {/* <h3 className="text-sm font-bold text-primary ">Story from SolanaStories</h3> */}
                  <TextToSpeech text={message.content} isVisible={!!message.content} />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start">
              <Avatar className="w-8 h-8 bg-primary justify-center">
                <BookOpen className="text-sm text-white pt-2" size={24}/>
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