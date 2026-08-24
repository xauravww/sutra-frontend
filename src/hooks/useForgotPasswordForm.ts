"use client";

import { useCallback, useState } from "react";
import { auth } from "@/lib/api";

/** Reusable forgot-password form state + submit. */
export function useForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    if (!email) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSuccess("If an account with that email exists, a reset link has been sent.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }, [email]);

  return { email, setEmail, error, success, loading, submit };
}
