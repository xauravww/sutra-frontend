"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type LoginRole = "legal_practitioner" | "judiciary";

/** Reusable login form state + submit. */
export function useLoginForm(redirectTo = "/workspace") {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<LoginRole>("legal_practitioner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        await login(email, password);
        // Redirect based on role from stored user
        const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const user = stored ? JSON.parse(stored) : null;
        let dest = redirectTo;
        if (user?.role === "judiciary") dest = "/cases";
        else if (user?.role === "legal_practitioner") dest = "/mediation";
        router.push(dest);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
    [login, email, password, router, redirectTo]
  );

  return { role, setRole, email, setEmail, password, setPassword, error, loading, submit };
}
