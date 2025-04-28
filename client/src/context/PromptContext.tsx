import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PromptContextType {
  prompt: string;
  setPrompt: (p: string) => void;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const PromptProvider = ({ children }: { children: ReactNode }) => {
  const [prompt, setPrompt] = useState<string>('');
  return (
    <PromptContext.Provider value={{ prompt, setPrompt }}>
      {children}
    </PromptContext.Provider>
  );
};

export const usePrompt = () => {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('`usePrompt` must be inside a PromptProvider');
  return ctx;
};
