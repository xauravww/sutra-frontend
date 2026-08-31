"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gavel,
  CreditCard,
  Package,
  LifeBuoy,
  BarChart3,
  History,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const ADMIN_NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/cases", label: "Cases", icon: Gavel },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/support", label: "Help Desk", icon: LifeBuoy },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/activity-logs", label: "Activity Logs", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" || pathname === "/admin/dashboard" : pathname.startsWith(href);

  const initials = user?.email?.charAt(0).toUpperCase() ?? "A";
  const name = user?.email?.split("@")[0] ?? "";
  const roleTitle = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Admin";
  const panelTitle = `${roleTitle} Panel`;

  const sidebarContent = (
    <div
      className={`h-full bg-white border-r border-sutra-line flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center border-b border-sutra-line ${
          collapsed ? "justify-center py-3.5" : "justify-start px-4 py-3.5"
        }`}
      >
        <Link href="/admin" className="no-underline">
          <Logo className="h-6 w-auto" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto">
        <ul className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center rounded-lg transition-colors ${
                    collapsed ? "justify-center w-11 h-11 mx-auto" : "gap-2.5 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-tint text-navy"
                      : "text-sutra-ink-2 hover:bg-sutra-bg hover:text-sutra-ink"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-navy rounded-r-full" />
                  )}
                  <item.icon className="w-[20px] h-[20px] flex-none" strokeWidth={1.7} />
                  {!collapsed && (
                    <span className="text-[13.5px] font-semibold truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sutra-line p-2.5 space-y-2">
        {!collapsed && user && (
          <Link
            href="/profile"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sutra-bg transition-colors no-underline"
          >
            <span className="w-8 h-8 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-sutra-ink truncate">{name}</span>
              <span className="block text-[11px] text-sutra-ink-3 capitalize">{user.role.replace(/_/g, " ")}</span>
            </span>
          </Link>
        )}
        <button
          onClick={logout}
          className={`flex items-center rounded-lg transition-colors text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 ${
            collapsed ? "justify-center w-11 h-11 mx-auto" : "gap-2.5 px-3 py-2.5 w-full"
          }`}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="w-[20px] h-[20px] flex-none" strokeWidth={1.7} />
          {!collapsed && <span className="text-[13.5px] font-semibold">Sign out</span>}
        </button>
        {!collapsed && (
          <div className="text-center">
            <button
              onClick={() => setCollapsed(true)}
              className="mx-auto p-1.5 rounded-lg text-sutra-ink-3 hover:bg-sutra-bg transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.7} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-sutra-bg flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block flex-shrink-0 sticky top-0 h-dvh">{sidebarContent}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebarContent}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header — role-based panel title + user, impersonation strip on top when active */}
        <header className="sticky top-0 z-30 bg-white border-b border-sutra-line">
          <ImpersonationBanner />
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-sutra-bg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-sutra-ink" strokeWidth={1.8} />
            </button>
            <p className="text-[15px] font-bold text-sutra-ink truncate">{panelTitle}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-lg text-sutra-ink-3 hover:bg-sutra-bg border border-sutra-line transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.7} />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.7} />
              )}
            </button>
            {user && (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sutra-bg transition-colors no-underline"
              >
                <span className="w-8 h-8 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none">
                  {initials}
                </span>
                <span className="hidden sm:block text-left">
                  <span className="block text-[12.5px] font-semibold text-sutra-ink truncate max-w-[140px]">{name}</span>
                  <span className="block text-[10.5px] text-sutra-ink-3 capitalize">{user.role.replace(/_/g, " ")}</span>
                </span>
              </Link>
            )}
          </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
