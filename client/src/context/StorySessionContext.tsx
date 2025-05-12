import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

type StorySessionContextType = {
  storySessionId: string;
  setStorySessionId: (id: string) => void;
  clearStorySession: () => void;
};

const StorySessionContext = createContext<StorySessionContextType | undefined>(undefined);

export const useStorySession = () => {
  const context = useContext(StorySessionContext);
  if (!context) throw new Error("useStorySession must be used within StorySessionProvider");
  return context;
};

export const StorySessionProvider = ({ children }: { children: ReactNode }) => {
  const [storySessionId, setStorySessionId] = useState<string>(() => {
    return localStorage.getItem("storySessionId") || "";
  });

  // Whenever `token` changes, write it back (or remove if empty)
  useEffect(() => {
    if (storySessionId) {
      localStorage.setItem("storySessionId", storySessionId);
    } else {
      localStorage.removeItem("storySessionId");
    }
  }, [storySessionId]);

  const clearStorySession = () => {
    setStorySessionId("");
  };

  return (
    <StorySessionContext.Provider value={{ storySessionId, setStorySessionId, clearStorySession }}>
      {children}
    </StorySessionContext.Provider>
  );
};
