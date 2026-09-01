import { createContext, useContext, useState, type ReactNode } from "react";
import { apiClient, clearTokens, getAccessToken, storeTokens } from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAccessToken()));

  async function login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    storeTokens(data.accessToken, data.refreshToken);
    setIsAuthenticated(true);
  }

  function logout() {
    clearTokens();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
