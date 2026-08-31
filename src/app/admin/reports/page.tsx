"use client";

import { useEffect, useState } from "react";
import { admin, type AdminAuditLog } from "@/lib/api";
import { PageHeader, StatCard, ErrorState } from "@/components/admin/ui";

interface CompStats {
  cases?: { total?: number; active?: number; delayed?: number };
  subscribers?: { total?: number; paid?: number; unpaid?: number; trial?: number };
  cvos?: { total?: number; active?: number; total_assigned_cases?: number; completed_cases?: number; pending_cases?: number };
  users?: { total?: number };
  charts?: {
    user_growth?: Array<{ month: string; new_users: string }>;
    revenue?: Array<{ month: string; revenue: string }>;
  };
}

const fmtMoney = (n: string | number) =>
  Number(n).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function AdminReportsPage() {
  const [stats, setStats] = useState<CompStats | null>(null);
  const [audit, setAudit] = useState<AdminAuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    setError("");
    admin.comprehensiveStats().then((r) => setStats(r.data as CompStats)).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    admin.auditLogs({ limit: 8 }).then((r) => setAudit(r.data.data)).catch(() => setAudit([]));
  };

  const growth = stats?.charts?.user_growth ?? [];
  const revenue = stats?.charts?.revenue ?? [];
  const maxGrowth = Math.max(1, ...growth.map((g) => Number(g.new_users)));
  const maxRevenue = Math.max(1, ...revenue.map((r) => Number(r.revenue)));

  return (
    <div>
      <PageHeader title="Reports" subtitle="Operational performance snapshot" />
      {error && !stats && <ErrorState title="Couldn't load reports" message={error} onRetry={load} />}

      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <StatCard label="Total Users" value={stats.users?.total ?? 0} tone="navy" />
            <StatCard label="Cases" value={stats.cases?.total ?? 0} hint={`${stats.cases?.active ?? 0} active · ${stats.cases?.delayed ?? 0} delayed`} tone="blue" />
            <StatCard label="Subscribers" value={stats.subscribers?.total ?? 0} hint={`${stats.subscribers?.paid ?? 0} paid · ${stats.subscribers?.trial ?? 0} trial`} tone="green" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* User growth bar chart */}
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">New Users / Month</h3>
              {growth.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3">No data</p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {growth.map((g) => (
                    <div key={g.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-sutra-ink-3 font-semibold">{g.new_users}</span>
                      <div className="w-full bg-navy rounded-t-md" style={{ height: `${Math.max(4, (Number(g.new_users) / maxGrowth) * 100)}px` }} />
                      <span className="text-[10px] text-sutra-ink-3 truncate">{g.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue bar chart */}
            <div className="bg-white border border-sutra-line rounded-xl p-5">
              <h3 className="text-[15px] font-bold text-sutra-ink mb-4">Monthly Revenue</h3>
              {revenue.length === 0 ? (
                <p className="text-[13px] text-sutra-ink-3">No data</p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {revenue.map((r) => (
                    <div key={r.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-sutra-ink-3 font-semibold">{fmtMoney(r.revenue)}</span>
                      <div className="w-full bg-green-bg border border-green-dot rounded-t-md" style={{ height: `${Math.max(4, (Number(r.revenue) / maxRevenue) * 100)}px` }} />
                      <span className="text-[10px] text-sutra-ink-3 truncate">{r.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Audit snapshot */}
      <div className="bg-white border border-sutra-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-sutra-line-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-sutra-ink">Recent Activity</h3>
          <a href="/admin/activity-logs" className="text-[13px] font-semibold text-navy no-underline hover:underline">
            View all →
          </a>
        </div>
        {audit.length === 0 ? (
          <p className="p-5 text-[13px] text-sutra-ink-3">No activity recorded.</p>
        ) : (
          <div className="divide-y divide-sutra-line-2">
            {audit.map((a) => {
              const details =
                typeof a.details === "string"
                  ? a.details
                  : a.details && typeof a.details === "object"
                    ? JSON.stringify(a.details)
                    : "";
              return (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-sutra-ink truncate">{a.action ?? "action"}</p>
                    {details && <p className="text-[12px] text-sutra-ink-3 truncate">{details.slice(0, 120)}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    <span className="text-[12px] text-sutra-ink-3 max-w-[160px] truncate">{a.user?.email ?? "—"}</span>
                    <span className="text-[12px] text-sutra-ink-3 whitespace-nowrap">
                      {a.created_at ? new Date(a.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
