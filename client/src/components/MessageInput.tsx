import { useState, useRef, useEffect } from "react";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { ArrowRight } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
}

const MessageInput = ({ onSendMessage, isDisabled = false, placeholder }: MessageInputProps) => {
  const [messageText, setMessageText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea when the component mounts
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
  };

  const handleSendMessage = () => {
    if (messageText.trim() && !isDisabled) {
      onSendMessage(messageText);
      setMessageText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
<section className="relative w-full">
  <div className="relative flex-grow">
    <Textarea
      ref={textareaRef}
      value={messageText}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      className="w-full p-3 rounded-lg bg-violet-50 text-black resize-none font-medium text-base"
      placeholder={placeholder}
      rows={2}
      disabled={isDisabled}
    />
    <Button
      onClick={handleSendMessage}
      disabled={!messageText.trim() || isDisabled}
      className="absolute top-2 right-2 p-3 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 shadow-md"
      aria-label="Send message"
    >
      <ArrowRight className="text-white" strokeWidth={3} fill="#ffffff"/>
    </Button>
  </div>
</section>

  );
}

export default MessageInput;
