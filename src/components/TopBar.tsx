"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-sutra-line sticky top-0 z-20">
      <div className="max-w-[940px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/workspace" className="flex items-center gap-3 no-underline">
          <span className="w-[42px] h-[42px] flex-none rounded-[11px] bg-navy text-white grid place-items-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[25px] h-[25px]">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/><path d="M12 3v18"/>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
          </span>
          <b className="text-[22px] font-bold tracking-tight text-sutra-ink">Sutra</b>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/workspace" className="text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
            Workspace
          </Link>
          <Link href="/mediation" className="text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
            Mediation
          </Link>

          <button
            className="w-[46px] h-[46px] rounded-[11px] border border-sutra-line bg-white text-sutra-ink-2 grid place-items-center relative hover:border-[#C6CDD7] hover:bg-[#FCFDFE] transition-colors"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-[23px] h-[23px]">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
            </svg>
          </button>

          {user && (
            <div className="flex items-center gap-3 px-4 py-1.5 border border-sutra-line rounded-full bg-white">
              <span className="w-[35px] h-[35px] rounded-full bg-navy text-white grid place-items-center font-bold text-[15px]">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <b className="text-[16px] font-semibold">{user.email.split("@")[0]}</b>
            </div>
          )}

          <button
            onClick={logout}
            className="text-sm font-semibold text-sutra-ink-3 hover:text-navy px-3 py-2 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
