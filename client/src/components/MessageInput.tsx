import { useState, useRef, useEffect } from "react";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
}

const MessageInput = ({ onSendMessage, isDisabled = false }: MessageInputProps) => {
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
    <section className="flex items-center gap-2">
      <div className="relative flex-grow">
        <Textarea
          ref={textareaRef}
          value={messageText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full resize-none border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/70 bg-card"
          placeholder="Type your story request here..."
          rows={2}
          disabled={isDisabled}
        />
      </div>
      <Button
        onClick={handleSendMessage}
        disabled={!messageText.trim() || isDisabled}
        className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 w-12 flex items-center justify-center flex-shrink-0 transition-colors p-0"
        aria-label="Send message"
      >
        <Send className="w-5 h-5" />
      </Button>
    </section>
  );
};

export default MessageInput;
