"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** Post-login destination per role. */
export const ROLE_HOME: Record<string, string> = {
  legal_practitioner: "/mediation",
  judiciary: "/cases",
  admin: "/admin",
  owner: "/admin",
  corpus_researcher: "/curation",
  corpus_curator: "/curation",
};

/**
 * Reusable login form state + submit.
 *
 * No "I Am" role selector: the backend derives the role from the account, so
 * the post-login destination comes straight from `user.role`.
 */
export function useLoginForm(redirectTo = "/workspace") {
  const router = useRouter();
  const { login } = useAuth();

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
        router.push((user?.role && ROLE_HOME[user.role]) || redirectTo);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
    [login, email, password, router, redirectTo]
  );

  return { email, setEmail, password, setPassword, error, loading, submit };
}
