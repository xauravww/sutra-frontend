"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { notifications, type AppNotification } from "@/lib/api";

export default function TopBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  // The Mediation link is redundant while already inside the mediation area.
  const onMediationPage = pathname === "/mediation" || (!!pathname && /^\/mediation\/\d+/.test(pathname));

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on outside click.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [mobileMenuOpen]);

  const loadStats = useCallback(() => {
    if (!user) return;
    notifications.stats().then((r) => setUnread(r.data?.unread ?? 0)).catch(() => undefined);
  }, [user]);

  const loadList = useCallback(() => {
    if (!user) return;
    setLoading(true);
    notifications
      .list({ limit: 10, unread_only: true })
      .then((r) => {
        const nextItems = r.data?.notifications ?? [];
        setItems(nextItems);
        // Keep the badge authoritative from the stats endpoint; the list is paginated.
        notifications.stats().then((stats) => setUnread(stats.data?.unread ?? 0)).catch(() => undefined);
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
      setItems((prev) => prev.filter((x) => x.id !== n.id));
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
    setItems([]);
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
        <Link href={home} className="flex items-center no-underline flex-none min-w-0">
          <Logo className="h-7 sm:h-9 w-auto max-w-[150px] sm:max-w-none object-contain" />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {isJudiciary && (
            <Link href="/cases" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Cases
            </Link>
          )}
          {isPractitioner && !onMediationPage && (
            <Link href="/mediation" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Mediation
            </Link>
          )}
          {(isJudiciary || isPractitioner) && (
            <Link href="/library" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Library
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Admin
            </Link>
          )}
          {user?.role === "owner" && (
            <Link href="/knowledge-base" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              Knowledge Base
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
              aria-label={
                open
                  ? "Close notifications"
                  : unread > 0
                    ? `Open notifications, ${unread} unread`
                    : "Open notifications"
              }
              aria-haspopup="true"
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5 sm:w-[23px] sm:h-[23px]">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
              </svg>
              {/* Decorative — the count is already in the button's label. */}
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  data-count={unread > 99 ? "99+" : String(unread)}
                  className="notif-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-white"
                />
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
              aria-label={`Your profile — ${user.email}`}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 border border-sutra-line rounded-full bg-white no-underline hover:border-[#C6CDD7] transition-colors flex-none"
            >
              {/* Initial is drawn from data-initial so it stays out of the
                  link's text, which otherwise read "Oowner" (#1610). */}
              <span
                aria-hidden="true"
                data-initial={user.email.charAt(0).toUpperCase()}
                className="avatar-initial w-[32px] h-[32px] rounded-full bg-navy text-white grid place-items-center font-bold text-[14px]"
              />
              <b aria-hidden="true" className="text-[14px] font-semibold text-sutra-ink max-w-[200px] md:max-w-xs truncate">{user.email}</b>
            </Link>
          )}

          {/* Mobile: hamburger menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden w-[38px] h-[38px] rounded-[10px] border border-sutra-line bg-white grid place-items-center text-sutra-ink-2 hover:text-navy hover:border-navy/40 transition-colors flex-none"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          {/* Mobile: just show avatar */}
          {user && (
            <Link
              href="/profile"
              aria-label="Your profile"
              className="sm:hidden w-[36px] h-[36px] rounded-full bg-navy text-white grid place-items-center font-bold text-[14px] no-underline flex-none avatar-initial"
              data-initial={user.email.charAt(0).toUpperCase()}
            />
          )}

          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto text-xs sm:text-sm font-semibold text-sutra-ink-3 hover:text-navy px-0 sm:px-3 py-2 rounded-lg transition-colors flex-none hover:bg-tint sm:hover:bg-transparent"
          >
            <svg className="w-[18px] h-[18px] sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer (Bug #1689) */}
      {mobileMenuOpen && (
        <nav
          ref={mobileMenuRef}
          aria-label="Mobile Navigation"
          className="sm:hidden border-t border-sutra-line bg-white px-4 py-3 shadow-lg space-y-1.5 animate-in"
        >
          {user && (
            <div className="pb-2.5 mb-2 border-b border-sutra-line-2 flex items-center gap-2.5 px-1">
              <span
                aria-hidden="true"
                data-initial={user.email.charAt(0).toUpperCase()}
                className="avatar-initial w-8 h-8 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-sutra-ink truncate">{user.email}</p>
                <p className="text-[11px] text-sutra-ink-3 capitalize">{user.role?.replace("_", " ")}</p>
              </div>
            </div>
          )}

          {isJudiciary && (
            <Link
              href="/cases"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname?.startsWith("/cases") ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
              }`}
            >
              <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              Cases
            </Link>
          )}

          {isPractitioner && (
            <Link
              href="/mediation"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname?.startsWith("/mediation") ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
              }`}
            >
              <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 9l9-6 9 6M6 12l6 9 6-9" /></svg>
              Mediation
            </Link>
          )}

          {(isJudiciary || isPractitioner) && (
            <Link
              href="/library"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname?.startsWith("/library") ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
              }`}
            >
              <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5a2.5 2.5 0 0 0 2.5 2.5H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /></svg>
              Library
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname?.startsWith("/admin") ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
              }`}
            >
              <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              Admin Panel
            </Link>
          )}

          {user?.role === "owner" && (
            <Link
              href="/knowledge-base"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname?.startsWith("/knowledge-base") ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
              }`}
            >
              <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
              Knowledge Base
            </Link>
          )}

          {isCorpus && (
            <Link
              href="/curation"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname?.startsWith("/curation") ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
              }`}
            >
              <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
              Corpus Curation
            </Link>
          )}

          <Link
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              pathname === "/profile" ? "bg-tint text-navy font-bold" : "text-sutra-ink-2 hover:bg-tint/60 hover:text-navy"
            }`}
          >
            <svg className="w-4 h-4 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            My Profile
          </Link>
        </nav>
      )}
    </header>
  );
}
