"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supportService, type SupportTicket, type TicketStats } from "@/lib/support";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  Pagination,
  StatCard,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const CATEGORY_OPTIONS = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical" },
  { value: "account", label: "Account" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_report", label: "Bug Report" },
  { value: "other", label: "Other" },
];

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-sutra-line-2 text-sutra-ink-2",
  medium: "bg-tint text-navy",
  high: "bg-amber-bg text-amber-ink",
  urgent: "bg-red-50 text-red-700",
};

function ticketStatusStyle(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-50 text-blue-700";
    case "in_progress":
      return "bg-amber-bg text-amber-ink";
    case "resolved":
      return "bg-green-bg text-green-ink";
    case "closed":
      return "bg-sutra-line-2 text-sutra-ink-2";
    default:
      return "bg-tint text-navy";
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const fetchTickets = useCallback(() => {
    setLoading(true);
    supportService
      .list({
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        q: search || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then((r) => {
        setTickets(r.data);
        setTotal(r.total);
        setLoadError("");
      })
      .catch((e) => {
        setTickets([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load tickets");
      })
      .finally(() => setLoading(false));
  }, [page, search, status, priority, category]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    supportService.stats().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div>
      <PageHeader title="Help Desk" subtitle={`${total.toLocaleString()} total tickets`} />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Open" value={stats.open} tone="blue" />
          <StatCard label="In Progress" value={stats.in_progress} tone="amber" />
          <StatCard label="Resolved" value={stats.resolved} tone="green" />
          <StatCard label="Closed" value={stats.closed} tone="navy" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search subject or email..." className="flex-1 min-w-[200px]" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} allLabel="All statuses" />
        <FilterSelect value={priority} onChange={(v) => { setPriority(v); setPage(1); }} options={PRIORITY_OPTIONS} allLabel="All priorities" />
        <FilterSelect value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={CATEGORY_OPTIONS} allLabel="All categories" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/2 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="Couldn't load tickets" message={loadError} onRetry={fetchTickets} />
      ) : tickets.length === 0 ? (
        <EmptyState title="No tickets found" description="Try adjusting your filters" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Ticket</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Priority</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Assignee</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Updated</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-sutra-bg/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/support/${t.id}`} className="no-underline">
                      <p className="text-[13.5px] font-semibold text-sutra-ink hover:text-navy truncate max-w-[260px]">
                        #{t.id} {t.subject}
                      </p>
                      <p className="text-[11.5px] text-sutra-ink-3 truncate max-w-[260px]">{t.description}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[180px]">{t.user?.email ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md bg-tint text-navy capitalize">
                      {t.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[t.priority] ?? "bg-tint text-navy"}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ticketStatusStyle(t.status)}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {t.assignee ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-tint text-navy">
                        {t.assignee.email}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-sutra-line-2 text-sutra-ink-2">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-3 whitespace-nowrap">
                    {new Date(t.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="h-8 w-8 rounded-lg border border-navy bg-white text-navy grid place-items-center hover:bg-navy hover:text-white transition-colors"
                        title={`View ticket #${t.id}`}
                        aria-label={`View ticket #${t.id}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </div>
  );
}
