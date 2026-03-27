"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  getToken, setToken, clearToken, isTokenExpired,
  getMachineId, setMachineId as storeMachineId, clearMachineId,
} from "@/lib/auth/auth";

interface AuthContextValue {
  token: string | null;
  machineId: string | null;
  isAuthenticated: boolean;
  login: (token: string, machineId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [machineId, setMachineIdState] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check URL params first (from agent UI redirect)
    const urlToken = searchParams.get("token");
    const pathMatch = pathname.match(/\/editor\/(\d+)/);

    if (urlToken && !isTokenExpired(urlToken) && pathMatch) {
      const mid = pathMatch[1];
      setToken(urlToken);
      storeMachineId(mid);
      setTokenState(urlToken);
      setMachineIdState(mid);
      // Clean URL
      router.replace(`/editor/${mid}`);
      setChecked(true);
      return;
    }

    // Check localStorage
    const stored = getToken();
    const storedMid = getMachineId();
    if (stored && !isTokenExpired(stored) && storedMid) {
      setTokenState(stored);
      setMachineIdState(storedMid);
    } else if (pathname.startsWith("/editor")) {
      // Only redirect to login if on editor page with no valid session
      clearToken();
      clearMachineId();
      router.replace("/");
    }
    setChecked(true);
  }, [router, pathname, searchParams]);

  const login = useCallback(
    (newToken: string, newMachineId: string) => {
      setToken(newToken);
      storeMachineId(newMachineId);
      setTokenState(newToken);
      setMachineIdState(newMachineId);
      router.replace(`/editor/${newMachineId}`);
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    clearMachineId();
    setTokenState(null);
    setMachineIdState(null);
    router.replace("/");
  }, [router]);

  if (!checked) return null;

  return (
    <AuthContext.Provider
      value={{
        token,
        machineId,
        isAuthenticated: !!token && !!machineId,
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
