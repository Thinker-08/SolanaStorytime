import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

type SessionContextType = {
  sessionId: string;
  setSessionId: (id: string) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem("sessionId") || "";
  });

  // Whenever `token` changes, write it back (or remove if empty)
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("sessionId", sessionId);
    } else {
      localStorage.removeItem("sessionId");
    }
  }, [sessionId]);

  const clearSession = () => {
    setSessionId("");
    localStorage.removeItem("sessionId");
  };

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
};
