"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { admin, type AdminSubscription } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtMoney = (n?: number | null) =>
  n == null ? "—" : Number(n).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const subId = Number(id);
  const { toast } = useNotify();

  const [sub, setSub] = useState<AdminSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    admin
      .getSubscription(subId)
      .then((r) => setSub(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load subscription"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId]);

  const changeStatus = async (next: string) => {
    if (!sub) return;
    try {
      await admin.updateSubscription(sub.id, { status: next });
      toast(`Status set to ${next}`, "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const resend = async () => {
    if (!sub) return;
    try {
      await admin.resendReminder(sub.id);
      toast("Reminder email sent", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to send reminder", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-sutra-line-2 rounded animate-pulse" />
        <div className="h-56 bg-white border border-sutra-line rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !sub) {
    return <EmptyState title="Subscription not found" description={error || "This subscription may have been removed."} />;
  }

  return (
    <div>
      <PageHeader
        title={`Subscription #${sub.id}`}
        subtitle={sub.user?.email ?? "User not linked"}
        actions={
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13.5px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors no-underline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Back
          </Link>
        }
      />

      <div className="bg-white border border-sutra-line rounded-xl p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-tint text-navy border border-tint-2 grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-6 h-6">
                <path d="M2 7h20v10H2zM2 10h20" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[19px] font-bold text-sutra-ink">{sub.plan?.name ?? "Plan"}</h2>
                <StatusBadge status={sub.status} />
              </div>
              <p className="text-[13px] text-sutra-ink-3 mt-1">
                {sub.user ? `${sub.user.email} (user #${sub.user.id})` : "No linked user"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resend}
              className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
            >
              Resend Reminder
            </button>
            <select
              value={sub.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="h-10 rounded-xl border border-sutra-line bg-white px-3 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
            >
              {["active", "cancelled", "past_due", "trialing"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-sutra-line-2 text-[13px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">Start date</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.start_date)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">End date</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.end_date)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">Amount paid</p>
            <p className="font-semibold text-sutra-ink">{fmtMoney(sub.amount_paid)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">Plan</p>
            <p className="font-semibold text-sutra-ink">{sub.plan?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">Last reminder sent</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.last_reminder_sent_at)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">Created</p>
            <p className="font-semibold text-sutra-ink">{fmtDate(sub.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
