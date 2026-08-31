"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { admin, type AdminSubscription, type AdminPlan } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  StatusBadge,
  Pagination,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

const SUB_STATUSES = [
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "past_due", label: "Past Due" },
  { value: "trialing", label: "Trialing" },
];

export default function AdminSubscriptionsPage() {
  const { toast, confirm } = useNotify();

  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [planId, setPlanId] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubscription | null>(null);
  const [form, setForm] = useState({ user_id: "", plan_id: "", status: "active", start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);

  const fetchSubs = useCallback(() => {
    setLoading(true);
    admin
      .listSubscriptions({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        status: status || undefined,
        user: search || undefined,
        planId: planId ? Number(planId) : undefined,
      })
      .then((r) => {
        setSubs(r.data.data);
        setTotal(r.data.total);
        setLoadError("");
      })
      .catch((e) => {
        setSubs([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load subscriptions");
      })
      .finally(() => setLoading(false));
  }, [page, search, status, planId]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const loadPlans = () => {
    if (plans.length === 0) {
      admin.listPlans({ limit: 100 }).then((r) => setPlans(r.data.data)).catch(() => setPlans([]));
    }
  };

  const openCreate = () => {
    loadPlans();
    setEditing(null);
    setForm({ user_id: "", plan_id: "", status: "active", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
    setModalOpen(true);
  };

  const openEdit = (s: AdminSubscription) => {
    loadPlans();
    setEditing(s);
    setForm({
      user_id: String(s.user_id ?? ""),
      plan_id: String(s.plan_id ?? ""),
      status: s.status,
      start_date: s.start_date?.slice(0, 10) ?? "",
      end_date: s.end_date?.slice(0, 10) ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      user_id: Number(form.user_id),
      plan_id: Number(form.plan_id),
      status: form.status,
      start_date: form.start_date || new Date().toISOString(),
      ...(form.end_date ? { end_date: form.end_date } : {}),
    };
    setSaving(true);
    try {
      if (editing) {
        await admin.updateSubscription(editing.id, payload);
        toast("Subscription updated", "success");
      } else {
        await admin.createSubscription(payload);
        toast("Subscription created", "success");
      }
      setModalOpen(false);
      fetchSubs();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: AdminSubscription) => {
    const ok = await confirm({
      title: "Delete subscription",
      message: `Delete subscription #${s.id}? This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deleteSubscription(s.id);
      toast("Subscription deleted", "success");
      fetchSubs();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const handleResend = async (s: AdminSubscription) => {
    try {
      await admin.resendReminder(s.id);
      toast("Reminder sent", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to send reminder", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle={`${total.toLocaleString()} total subscriptions`}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Subscription
          </button>
        }
      />

      <div className="bg-amber-bg border border-amber-ink/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-ink flex-none mt-0.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01" />
          <path d="M12 12v4" />
        </svg>
        <div>
          <p className="text-[13.5px] font-semibold text-amber-ink">Subscriptions are not enabled right now</p>
          <p className="text-[12.5px] text-amber-ink/90 mt-0.5">
            This section is inactive in the current build. Data below may be legacy or empty — do not use it to make decisions.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search user email..." className="flex-1 min-w-[200px]" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={SUB_STATUSES} allLabel="All statuses" />
        <FilterSelect
          value={planId}
          onChange={(v) => { setPlanId(v); setPage(1); }}
          options={plans.map((p) => ({ value: String(p.id), label: p.name }))}
          allLabel="All plans"
        />
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
        <ErrorState title="Couldn't load subscriptions" message={loadError} onRetry={fetchSubs} />
      ) : subs.length === 0 ? (
        <EmptyState title="No subscriptions found" description="Try adjusting your filters" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Plan</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Period</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-sutra-bg/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/subscriptions/${s.id}`} className="text-[13px] font-bold text-navy no-underline hover:underline">
                      #{s.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-semibold text-sutra-ink truncate max-w-[200px]">{s.user?.email ?? "—"}</p>
                    {s.user?.first_name && <p className="text-[11.5px] text-sutra-ink-3 truncate">{s.user.first_name} {s.user.last_name}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2">{s.plan?.name ?? "—"}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3.5 text-[12px] text-sutra-ink-3 whitespace-nowrap">
                    {s.start_date ? new Date(s.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    {" → "}
                    {s.end_date ? new Date(s.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResend(s)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                        title="Resend reminder email"
                      >
                        Remind
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-4">
              {editing ? `Edit Subscription #${editing.id}` : "New Subscription"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">User ID *</label>
                <input
                  type="number"
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  placeholder="Numeric user id"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Plan *</label>
                <select
                  value={form.plan_id}
                  onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
                >
                  {SUB_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Start date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">End date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !form.user_id || !form.plan_id}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
