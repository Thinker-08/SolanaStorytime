import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  token: string;
  setToken: (token: string) => void;
  clearToken: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to consume AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Provider that persists `token` in localStorage
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem("authToken") || "";
  });

  // Whenever `token` changes, write it back (or remove if empty)
  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }, [token]);

  const clearToken = () => {
    setToken("");
  };

  return (
    <AuthContext.Provider value={{ token, setToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  );
};
