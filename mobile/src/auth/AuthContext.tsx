import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, clearTokens, getAccessToken, getCurrentUserType, storeTokens } from "../api/client";

type UserType = "yonetici" | "sakin";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  userType: UserType | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<UserType | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        setUserType(await getCurrentUserType());
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    await storeTokens(data.accessToken, data.refreshToken);
    setUserType(await getCurrentUserType());
    setIsAuthenticated(true);
  }

  function logout() {
    clearTokens();
    setIsAuthenticated(false);
    setUserType(null);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userType, login, logout }}>
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
