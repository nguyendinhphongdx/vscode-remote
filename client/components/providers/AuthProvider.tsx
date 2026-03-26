"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken, clearToken, isTokenExpired } from "@/lib/auth/auth";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = getToken();
    if (stored && !isTokenExpired(stored)) {
      setTokenState(stored);
    }
    setChecked(true);
  }, []);

  const login = useCallback(
    (newToken: string) => {
      setToken(newToken);
      setTokenState(newToken);
      router.replace("/editor");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    router.replace("/login");
  }, [router]);

  if (!checked) return null;

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
