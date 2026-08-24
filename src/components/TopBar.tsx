"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function TopBar() {
  const { user, logout } = useAuth();

  const isJudiciary = user?.role === "judiciary";
  const isPractitioner = user?.role === "legal_practitioner";

  return (
    <header className="bg-white border-b border-sutra-line sticky top-0 z-20">
      <div className="max-w-[940px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <Link href={isJudiciary ? "/cases" : isPractitioner ? "/mediation" : "/workspace"} className="flex items-center gap-2 sm:gap-3 no-underline flex-none">
          <span className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] flex-none rounded-[10px] sm:rounded-[11px] bg-navy text-white grid place-items-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-[25px] sm:h-[25px]">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/><path d="M12 3v18"/>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
          </span>
          <b className="text-[18px] sm:text-[22px] font-bold tracking-tight text-sutra-ink">Sutra</b>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {isJudiciary && (
            <Link href="/cases" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Cases
            </Link>
          )}
          {isPractitioner && (
            <Link href="/mediation" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Mediation
            </Link>
          )}

          <button
            className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-[10px] sm:rounded-[11px] border border-sutra-line bg-white text-sutra-ink-2 grid place-items-center relative hover:border-[#C6CDD7] hover:bg-[#FCFDFE] transition-colors flex-none"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5 sm:w-[23px] sm:h-[23px]">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
            </svg>
          </button>

          {user && (
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 border border-sutra-line rounded-full bg-white no-underline hover:border-[#C6CDD7] transition-colors flex-none"
            >
              <span className="w-[32px] h-[32px] rounded-full bg-navy text-white grid place-items-center font-bold text-[14px]">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <b className="text-[14px] font-semibold text-sutra-ink max-w-[100px] truncate">{user.email.split("@")[0]}</b>
            </Link>
          )}

          {/* Mobile: just show avatar */}
          {user && (
            <Link
              href="/profile"
              className="sm:hidden w-[36px] h-[36px] rounded-full bg-navy text-white grid place-items-center font-bold text-[14px] no-underline flex-none"
            >
              {user.email.charAt(0).toUpperCase()}
            </Link>
          )}

          <button
            onClick={logout}
            className="text-xs sm:text-sm font-semibold text-sutra-ink-3 hover:text-navy px-2 sm:px-3 py-2 rounded-lg transition-colors flex-none"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
