"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Radio from "@/components/ui/Radio";
import Button from "@/components/ui/Button";
import { useLoginForm, type LoginRole } from "@/hooks/useLoginForm";

const ROLES: { value: LoginRole; label: string }[] = [
  { value: "legal_practitioner", label: "Legal Practitioner" },
  { value: "judiciary", label: "Honourable Judiciary" },
];

export default function LoginPage() {
  const { role, setRole, email, setEmail, password, setPassword, error, loading, submit } =
    useLoginForm();

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-sutra-bg">
      <header className="flex-none border-b border-sutra-line bg-white px-5 py-3.5 sm:px-8">
        <Logo className="h-7 sm:h-8 w-auto" />
      </header>

      <main className="flex-1 min-h-0 grid place-items-center px-4 py-5 sm:px-6">
        <form
          onSubmit={submit}
          className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7"
        >
          <fieldset>
            <legend className="text-[13px] font-semibold text-sutra-ink-2 mb-2">I Am</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
              {ROLES.map((r) => (
                <Radio
                  key={r.value}
                  name="role"
                  value={r.value}
                  label={r.label}
                  checked={role === r.value}
                  onChange={(v) => setRole(v as LoginRole)}
                />
              ))}
            </div>
            <p className="text-[11px] text-sutra-ink-3 mb-5">
              {role === "judiciary"
                ? "Judicial Case Intelligence — upload & analyze case files"
                : "Mediation Sessions — facilitate party negotiations"}
            </p>
          </fieldset>

          <div className="mb-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-sutra-ink-2 no-underline hover:text-navy"
            >
              forgot password?
            </Link>
          </div>

          {error && (
            <div className="mt-3">
              <p className="text-[13px] text-red-700">{error}</p>
              {error.toLowerCase().includes("pending verification") && email && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="text-[13px] font-semibold text-navy hover:underline mt-1 inline-block"
                >
                  Verify your email →
                </Link>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <Button type="submit" loading={loading} className="w-full sm:w-auto">
              {loading ? "Signing in..." : "Login"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/register"
              className="text-[13px] font-medium text-sutra-ink-2 no-underline hover:text-navy"
            >
              Create a New Account
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
