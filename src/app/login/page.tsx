"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Role = "practitioner" | "judiciary";

const COURTS = [
  "Supreme Court of India",
  "High Court — Principal Bench",
  "District & Sessions Court",
  "Family Court",
  "Commercial Court",
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<Role>("practitioner");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [court, setCourt] = useState(COURTS[2]);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isJudiciary = role === "judiciary";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
      router.push("/workspace");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh grid grid-cols-[1.02fr_1fr] max-lg:grid-cols-1">
      {/* ─── Brand panel ─── */}
      <aside className="relative overflow-hidden bg-navy text-white p-[54px_56px] flex flex-col max-lg:p-[34px_28px_30px]">
        {/* Watermark scales */}
        <svg className="absolute -right-[70px] -bottom-[70px] w-[380px] h-[380px] text-white opacity-[.07] pointer-events-none max-lg:w-[240px] max-lg:h-[240px] max-lg:-right-[50px] max-lg:-bottom-[60px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
          <path d="M7 21h10"/><path d="M12 3v18"/>
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
        </svg>

        {/* Logo */}
        <div className="flex items-center gap-3.5 relative z-10">
          <span className="w-11 h-11 rounded-[11px] border border-white/35 grid place-items-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/><path d="M12 3v18"/>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
          </span>
          <b className="text-[23px] font-bold tracking-wide">Sutra</b>
        </div>

        {/* Body */}
        <div className="mt-auto mb-auto max-w-[460px] relative z-10 max-lg:my-6">
          <h1 className="text-[37px] leading-[1.14] font-bold tracking-tight max-lg:text-[28px]">
            Legal Intelligence Workspace
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-white/80">
            AI-assisted case analysis for advocates and the judiciary — read, question and understand large case files in minutes.
          </p>
          <ul className="mt-7 space-y-4 list-none">
            {[
              "Chat and speak with your case files",
              "Page-by-page summaries in seconds",
              "Surface witnesses, IO and police station at a click",
              "Assess whether a matter can go to mediation",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3.5 text-[16px] text-white/94">
                <span className="flex-none w-[26px] h-[26px] rounded-[7px] bg-white/14 grid place-items-center mt-px">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2.5 text-[13.5px] text-white/60">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Authorized access only · All activity is logged
        </div>
      </aside>

      {/* ─── Form panel ─── */}
      <main className="flex items-center justify-center p-[44px_40px] bg-white max-lg:p-[38px_28px_56px] h-full">
        <form className="w-full max-w-[432px]" onSubmit={handleSubmit}>
          <h2 className="text-[26px] font-bold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-1.5 text-[15.5px] text-sutra-ink-3 mb-6">Select your category to continue.</p>

          {/* Role selector */}
          <label className="block text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2.5">I am a</label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { value: "practitioner", title: "Legal Practitioner", desc: "Advocate · law firm", icon: <rect width="20" height="14" x="2" y="7" rx="2"/>, icon2: <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/> },
              { value: "judiciary", title: "Honourable Judiciary", desc: "Judge · court", icon: <path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8"/>, icon2: <><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></> },
            ] as const).map((r) => (
              <label key={r.value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="sr-only"
                />
                <span className={`block border-[1.5px] rounded-xl p-[15px] transition-all overflow-hidden ${
                  role === r.value
                    ? "border-navy bg-tint"
                    : "border-sutra-line bg-white hover:border-[#C6CDD7]"
                }`}>
                  <span className="flex gap-3 items-start">
                    <span className={`flex-none w-10 h-10 rounded-[10px] grid place-items-center border transition-colors ${
                      role === r.value
                        ? "bg-tint-2 text-navy border-[#CFE0F0]"
                        : "bg-[#F2F5F9] text-sutra-ink-3 border-sutra-line-2"
                    }`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                        {r.icon}
                        {r.icon2}
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15.5px] font-bold leading-tight">{r.title}</span>
                      <span className="block text-[12.5px] text-sutra-ink-3 mt-0.5">{r.desc}</span>
                    </span>
                    {role === r.value && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-navy text-white grid place-items-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      </span>
                    )}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {/* Court selector (judiciary only) */}
          {isJudiciary && (
            <div className="mb-4">
              <label className="block text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2.5">Court / Bench</label>
              <select
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="w-full min-h-[54px] border-[1.5px] border-sutra-line rounded-[11px] px-4 font-[inherit] text-[16.5px] text-sutra-ink bg-white outline-none transition-colors focus:border-focus appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 fill=%22none%22 stroke=%22%236B7481%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_14px_center] pr-11"
              >
                {COURTS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Identifier */}
          <div className="mb-[17px]">
            <label className="block text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2.5">
              {isJudiciary ? "Judicial ID" : "Bar Council ID or email"}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isJudiciary ? "e.g. JUD-DL-00841" : "e.g. D/1234/2015 or name@firm.in"}
              autoComplete="username"
              className="w-full min-h-[54px] border-[1.5px] border-sutra-line rounded-[11px] px-4 font-[inherit] text-[16.5px] text-sutra-ink bg-white outline-none transition-colors placeholder:text-sutra-ink-3 focus:border-focus"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-[17px]">
            <label className="block text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full min-h-[54px] border-[1.5px] border-sutra-line rounded-[11px] px-4 pr-[52px] font-[inherit] text-[16.5px] text-sutra-ink bg-white outline-none transition-colors placeholder:text-sutra-ink-3 focus:border-focus"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[42px] h-[42px] border-0 bg-transparent text-sutra-ink-3 grid place-items-center rounded-lg hover:text-sutra-ink-2 hover:bg-[#F2F5F9] transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px]">
                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/>
                    <path d="M6.6 6.6C3.6 8.24 2 12 2 12s3.5 7 10 7a9.3 9.3 0 0 0 5.4-1.6"/>
                    <path d="m2 2 20 20"/>
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px]">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember + forgot */}
          <div className="flex items-center justify-between gap-3 my-1 mb-5">
            <label className="flex items-center gap-2.5 text-[14.5px] text-sutra-ink-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-[19px] h-[19px] accent-navy"
              />
              Keep me signed in
            </label>
            <a href="#" className="text-navy font-semibold text-[14.5px] no-underline hover:underline">Forgot password?</a>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2.5 bg-navy text-white border-0 rounded-xl text-[17px] font-semibold px-6 py-3.5 min-h-[52px] transition-colors hover:bg-navy-dark disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3.5 my-4 text-sutra-ink-3 text-[13.5px] font-semibold">
            <span className="flex-1 h-px bg-sutra-line"/>
            or
            <span className="flex-1 h-px bg-sutra-line"/>
          </div>

          {/* OTP */}
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2.5 bg-white text-navy border-2 border-navy rounded-xl text-[16px] font-bold px-6 py-3 min-h-[50px] transition-colors hover:bg-navy hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <path d="M12 19v3"/>
            </svg>
            Sign in with OTP
          </button>

          {/* Legal note */}
          <p className="flex items-start gap-2.5 mt-6 text-[13px] text-sutra-ink-3 leading-relaxed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4 flex-none mt-px">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            This is a restricted system for verified legal professionals and judicial officers. Unauthorized access is prohibited and logged.
          </p>
        </form>
      </main>
    </div>
  );
}
