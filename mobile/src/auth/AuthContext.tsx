import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, clearTokens, getAccessToken, storeTokens } from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAccessToken().then((token) => {
      setIsAuthenticated(Boolean(token));
      setIsLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    await storeTokens(data.accessToken, data.refreshToken);
    setIsAuthenticated(true);
  }

  function logout() {
    clearTokens();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  }
  return ctx;
}
