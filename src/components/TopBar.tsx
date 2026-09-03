"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { notifications, type AppNotification } from "@/lib/api";

export default function TopBar() {
  const { user, logout } = useAuth();

  const isJudiciary = user?.role === "judiciary";
  const isPractitioner = user?.role === "legal_practitioner";
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isCorpus = user?.role === "corpus_researcher" || user?.role === "corpus_curator";

  const home = isJudiciary
    ? "/cases"
    : isPractitioner
      ? "/mediation"
      : isAdmin
        ? "/admin"
        : isCorpus
          ? "/curation"
          : "/workspace";

  // ── Notifications (bell) ─────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadStats = useCallback(() => {
    if (!user) return;
    notifications.stats().then((r) => setUnread(r.data?.unread ?? 0)).catch(() => undefined);
  }, [user]);

  const loadList = useCallback(() => {
    if (!user) return;
    setLoading(true);
    notifications
      .list({ limit: 10 })
      .then((r) => {
        setItems(r.data ?? []);
        const u = r.data?.filter((n) => !n.read_at && n.status !== "read").length ?? 0;
        setUnread(u);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Prime the unread badge on mount, and whenever the session changes.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleBell = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const openNotification = async (n: AppNotification) => {
    if (!n.read_at) {
      notifications.markRead(n.id).catch(() => undefined);
      setUnread((v) => Math.max(0, v - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: x.read_at ?? new Date().toISOString() } : x)));
    }
    setOpen(false);
    if (n.action_url) {
      // Internal paths navigate with the SPA shell; external links open in a tab.
      const url = n.action_url;
      if (url.startsWith("/")) window.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const markAllRead = async () => {
    notifications.markAllRead().catch(() => undefined);
    setUnread(0);
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  };

  const fmtWhen = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <header className="bg-white border-b border-sutra-line sticky top-0 z-20">
      <ImpersonationBanner />
      <div className="max-w-[940px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <Link href={home} className="flex items-center no-underline flex-none">
          <Logo />
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
          {isAdmin && (
            <Link href="/admin" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Admin
            </Link>
          )}
          {isCorpus && (
            <Link href="/curation" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Corpus
            </Link>
          )}

          <div className="relative flex-none" ref={bellRef}>
            <button
              onClick={toggleBell}
              className={`w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-[10px] sm:rounded-[11px] border border-sutra-line bg-white grid place-items-center relative hover:border-[#C6CDD7] hover:bg-[#FCFDFE] transition-colors flex-none ${
                open ? "text-navy border-navy/40 bg-tint/60" : "text-sutra-ink-2"
              }`}
              aria-label={open ? "Close notifications" : "Open notifications"}
              aria-haspopup="true"
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5 sm:w-[23px] sm:h-[23px]">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[min(360px,calc(100vw-32px))] bg-white border border-sutra-line rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden animate-in">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-sutra-line bg-white">
                  <p className="text-[14px] font-bold text-sutra-ink">Notifications</p>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-[12px] font-semibold text-navy hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-sutra-line-2">
                  {loading && items.length === 0 ? (
                    <div className="px-4 py-6 space-y-2">
                      <div className="h-3.5 bg-sutra-line-2 rounded animate-pulse" />
                      <div className="h-3.5 bg-sutra-line-2 rounded animate-pulse w-3/4" />
                      <div className="h-3.5 bg-sutra-line-2 rounded animate-pulse w-1/2" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="w-11 h-11 rounded-full bg-tint text-navy grid place-items-center mx-auto mb-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
                        </svg>
                      </div>
                      <p className="text-[13.5px] font-semibold text-sutra-ink">You're all caught up</p>
                      <p className="text-[12px] text-sutra-ink-3 mt-0.5">New alerts will appear here.</p>
                    </div>
                  ) : (
                    items.map((n) => {
                      const read = !!n.read_at || n.status === "read";
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => openNotification(n)}
                          className="w-full text-left px-4 py-3 hover:bg-sutra-bg/60 transition-colors flex gap-3"
                        >
                          <span className={`flex-none w-2 h-2 rounded-full mt-1.5 ${read ? "bg-transparent" : "bg-red-500"}`} aria-hidden />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[13px] leading-snug ${read ? "font-medium text-sutra-ink-2" : "font-semibold text-sutra-ink"}`}>{n.title || "Notification"}</span>
                              <span className="text-[10.5px] text-sutra-ink-3 whitespace-nowrap">{fmtWhen(n.created_at)}</span>
                            </span>
                            {n.message && <span className={`block mt-0.5 text-[12px] leading-snug ${read ? "text-sutra-ink-3" : "text-sutra-ink-2"}`}>{n.message}</span>}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-sutra-line px-4 py-2.5 bg-white">
                  <button type="button" onClick={() => setOpen(false)} className="block w-full text-center text-[12.5px] font-semibold text-sutra-ink-2 hover:text-navy py-1">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

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
