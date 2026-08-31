"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { auth, systemSettings } from "./api";

interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    const res = await auth.login({ email, password, role });
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
    // Redirect to login after signout
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  // Idle session timeout — any logged-in user is signed out after
  // `session_timeout_minutes` of inactivity (0/absent = never).
  useEffect(() => {
    if (!user) return;

    let minutes = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const arm = () => {
      if (timer) clearTimeout(timer);
      if (minutes <= 0) return;
      timer = setTimeout(() => {
        if (disposed) return;
        // Record the inactivity timeout in the audit log, then sign out.
        auth.timeout().catch(() => undefined);
        logout();
      }, minutes * 60 * 1000);
    };

    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    const reset = arm;
    const bind = () => events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const unbind = () => events.forEach((e) => window.removeEventListener(e, reset));

    systemSettings
      .get()
      .then((r) => {
        if (disposed) return;
        const raw = (r.data as Record<string, string>)["session_timeout_minutes"];
        minutes = parseInt(raw ?? "0", 10) || 0;
        if (minutes <= 0) return;
        bind();
        arm();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unbind();
    };
  }, [user?.id, logout]);

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
