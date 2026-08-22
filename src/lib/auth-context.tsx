"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { auth, type AuthTokens } from "./api";

interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    const tokens = res.data;

    // Store tokens client-side (httpOnly cookies are also set by the server)
    if (tokens.accessToken) localStorage.setItem("accessToken", tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem("refreshToken", tokens.refreshToken);
    if (tokens.user) {
      localStorage.setItem("user", JSON.stringify(tokens.user));
      setUser(tokens.user);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  // During SSR/prerender, context is null — return safe defaults
  if (!ctx) {
    return { user: null, loading: true, login: async () => {}, logout: async () => {} };
  }
  return ctx;
}
