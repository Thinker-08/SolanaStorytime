"use client";

import { useEffect, useState } from "react";
import { useSession } from "../context/SessionContext";

type Messages = {
  role: "user" | "assistant";
  content: string;
};

type ChatItem = {
  id: string;
  messages: Messages[];
};

type TaskPaneProps = {
  token: string;
  onClose: () => void;
};

export default function TaskPane({ token, onClose }: TaskPaneProps) {
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const { setSessionId } = useSession();
  useEffect(() => {
    // Replace this with your actual fetch logic
    const fetchChatHistory = async () => {
      try {
        const response = await fetch("/api/chat-history", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch chat history");
        const data = await response.json();
        setChatHistory(data.history || []); // assuming API returns { history: [...] }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, [token]);

  const handleChatClick = (chatId: string) => {
    console.log("Clicked chat:", chatId);
    setSessionId(chatId)
  };

  return (
    <div className="fixed top-0 left-0 h-full w-64 bg-background border-r border-muted-foreground z-50 p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-muted-foreground">Chats</h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-primary"
          aria-label="Close Task Pane"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <ul className="space-y-2">
        {chatHistory.length === 0 ? (
          <li className="text-muted-foreground italic">No chats found</li>
        ) : (
          chatHistory.map((chat) => {
            const lastMessage =
              chat.messages[chat.messages.length - 1]?.content || "No messages";
            const truncated =
              lastMessage.length > 50
                ? lastMessage.slice(0, 50) + "..."
                : lastMessage;

            return (
              <li
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                className="cursor-pointer hover:text-primary transition-colors"
              >
                {truncated}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
