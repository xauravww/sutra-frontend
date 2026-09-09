"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  rateLimits,
  type RateLimitPolicyInfo,
  type RateLimitPolicyClient,
  type RateLimitUserRow,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  SearchInput,
  Th,
  Td,
} from "@/components/admin/ui";

/* ------------------------------------------------------------------ */
/*  Display helpers                                                     */
/* ------------------------------------------------------------------ */

const KIND_META: Record<string, { label: string; cls: string }> = {
  global: { label: "Global", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  group: { label: "Group", cls: "bg-tint text-navy border border-tint-2" },
  specific: { label: "Endpoint", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
};

function KindBadge({ kind }: { kind: string }) {
  const m = KIND_META[kind] ?? KIND_META.group;
  return (
    <span className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${m.cls}`}>
      {m.label}
    </span>
  );
}

/** "1 min" / "30 sec" / "3 hr" from a minutes value. */
function fmtWindow(minutes: number): string {
  if (minutes >= 60) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
  }
  if (minutes >= 1 && Number.isInteger(minutes)) return `${minutes} min`;
  return `${Math.round(minutes * 60)} sec`;
}

/** Live counter bar: how full the current window is vs the limit. */
function UsageBar({ policy }: { policy: RateLimitPolicyInfo }) {
  const limit = Math.max(1, policy.limit);
  const hits = Math.min(policy.usage.hits, limit * 2);
  const pct = Math.min(100, Math.round((hits / limit) * 100));
  const blocked = pct >= 100;
  const barCls = blocked
    ? "bg-gradient-to-r from-red-600 to-red-500"
    : pct >= 75
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : "bg-gradient-to-r from-[#1E3A8A] to-[#3B76D6]";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <div className="flex-1 h-2 rounded-full bg-sutra-bg overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] tabular-nums text-sutra-ink-2 whitespace-nowrap w-[104px] text-right">
        <span className={`font-semibold ${blocked ? "text-red-600" : "text-sutra-ink"}`}>{policy.usage.hits.toLocaleString()}</span>
        {" / "}
        {policy.limit.toLocaleString()}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminRateLimitsPage() {
  const { user: me } = useAuth();
  const { toast, confirm } = useNotify();
  const isOwner = me?.role === "owner";

  const [policies, setPolicies] = useState<RateLimitPolicyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [auto, setAuto] = useState(true);

  // Inline edit state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftLimit, setDraftLimit] = useState("");
  const [draftWindow, setDraftWindow] = useState("");
  const [saving, setSaving] = useState(false);
  const busySeq = useRef(0); // guard overlapping enable/save toggles

  // Client drill-down state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clients, setClients] = useState<RateLimitPolicyClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Per-user lookup
  const [email, setEmail] = useState("");
  const [userRow, setUserRow] = useState<{ userId: number; rows: RateLimitUserRow[] } | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await rateLimits.overview();
      setPolicies(res.data.policies);
      setError("");
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load rate limits");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadOverview(true);
      setLoading(false);
    })();
  }, [loadOverview]);

  // Gentle auto-refresh so the live counters stay current while the page is open.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => void loadOverview(true), 10000);
    return () => clearInterval(t);
  }, [auto, loadOverview]);

  const togglePolicy = async (p: RateLimitPolicyInfo) => {
    if (!isOwner || saving) return;
    const seq = ++busySeq.current;
    setSaving(true);
    try {
      await rateLimits.updatePolicy(p.code, { enabled: !p.enabled });
      toast(!p.enabled ? `"${p.label}" enabled` : `"${p.label}" paused`, !p.enabled ? "success" : "info");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update policy", "error");
    } finally {
      if (seq === busySeq.current) setSaving(false);
    }
  };

  const startEdit = (p: RateLimitPolicyInfo) => {
    setEditingCode(p.code);
    setDraftLimit(String(p.limit));
    setDraftWindow(String(p.window_minutes));
  };

  const savePolicy = async (p: RateLimitPolicyInfo) => {
    const limit = Number(draftLimit);
    const windowMinutes = Number(draftWindow);
    if (!Number.isInteger(limit) || limit < 1) return toast("Limit must be a positive whole number", "error");
    if (!Number.isInteger(windowMinutes) || windowMinutes < 1) return toast("Window must be a positive whole number of minutes", "error");
    setSaving(true);
    try {
      await rateLimits.updatePolicy(p.code, { limit, window_minutes: windowMinutes });
      setEditingCode(null);
      toast(`"${p.label}" updated`, "success");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save policy", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setDraftLimit("");
    setDraftWindow("");
  };

  const resetPolicy = async (p: RateLimitPolicyInfo) => {
    const ok = await confirm({
      message: `Reset all "in window" counters for ${p.label} (${p.code})?`,
      confirmLabel: "Reset policy",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await rateLimits.reset({ target: "policy", code: p.code });
      toast(`Cleared ${res.data.cleared} counter(s)`, "success");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reset failed", "error");
    }
  };

  const resetAll = async () => {
    if (!isOwner) return;
    const ok = await confirm({
      message: "Reset EVERY rate-limit counter on the platform (all policies, all users/IPs)?",
      confirmLabel: "Reset everything",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await rateLimits.reset({ target: "all" });
      toast(`Cleared ${res.data.cleared} counter(s)`, "success");
      await loadOverview(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reset failed", "error");
    }
  };

  const toggleClients = async (code: string) => {
    if (expanded === code) {
      setExpanded(null);
      setClients([]);
      return;
    }
    setExpanded(code);
    setClientsLoading(true);
    try {
      const res = await rateLimits.policyClients(code);
      setClients(res.data.clients);
    } catch (e) {
      setClients([]);
      toast(e instanceof Error ? e.message : "Failed to load clients", "error");
    } finally {
      setClientsLoading(false);
    }
  };

  const resetClient = async (c: RateLimitPolicyClient) => {
    const ok = await confirm({
      message: `Reset the rate-limit counters for this ${c.kind} (${c.identifier}) on ${expanded}?`,
      confirmLabel: "Reset",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const target = c.kind === "user" ? "user" : "ip";
      const res = await rateLimits.reset({ target, id: c.kind === "user" ? Number(c.identifier) : c.identifier });
      toast(`Cleared ${res.data.cleared} counter(s)`, "success");
      await toggleClients(expanded as string);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reset failed", "error");
    }
  };

  const lookupUser = async () => {
    const em = email.trim();
    if (!em) return;
    setUserLoading(true);
    try {
      const res = await rateLimits.userUsageByEmail(em);
      setUserRow({ userId: res.data.userId, rows: res.data.rows });
    } catch (e) {
      setUserRow(null);
      toast(e instanceof Error ? e.message : "User not found", "error");
    } finally {
      setUserLoading(false);
    }
  };

  const resetUser = async () => {
    if (!userRow) return;
    const ok = await confirm({
      message: `Reset every rate-limit counter for ${email.trim()} (user ${userRow.userId})?`,
      confirmLabel: "Reset user",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await rateLimits.reset({ target: "user", id: userRow.userId });
      toast(`Cleared ${res.data.cleared} counter(s)`, "success");
      await lookupUser();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reset failed", "error");
    }
  };

  const statRows = policies.reduce(
    (acc, p) => {
      acc.policies++;
      if (p.enabled) acc.enabled++;
      acc.hits += p.usage.hits;
      acc.blocked += p.usage.blocked;
      return acc;
    },
    { policies: 0, enabled: 0, hits: 0, blocked: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Rate Limits"
        subtitle="Owner-configurable request ceilings. Edits apply within ~3 seconds — no redeploy needed. Defaults match what the app enforced before this panel."
        actions={
          <>
            <label className="flex items-center gap-2 text-[13px] text-sutra-ink-2 cursor-pointer select-none">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[#1E3A8A] w-3.5 h-3.5" />
              Auto-refresh
            </label>
            <button
              onClick={() => loadOverview()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-xl border border-sutra-line bg-white text-[13px] font-semibold text-sutra-ink hover:border-focus transition-colors disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            {isOwner && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-xl bg-red-700 text-white text-[13px] font-semibold hover:bg-red-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset all
              </button>
            )}
          </>
        }
      />

      {error && !loading && <div className="mb-5"><ErrorState title="Couldn't load rate limits" message={error} onRetry={() => loadOverview()} /></div>}

      {loading ? (
        <div className="bg-white border border-sutra-line rounded-xl p-10 text-center text-[14px] text-sutra-ink-3">Loading policies…</div>
      ) : policies.length === 0 ? (
        <EmptyState title="No rate-limit policies" description="Policies register themselves the first time their endpoint is hit, or once a limiter is mounted." />
      ) : (
        <div className="space-y-5">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Policies" value={statRows.policies} hint={`${statRows.enabled} active · ${statRows.policies - statRows.enabled} paused`} tone="navy" />
            <StatCard label="Requests (window)" value={statRows.hits.toLocaleString()} hint="Live hits across enabled policies" tone="blue" />
            <StatCard label="Blocked (429)" value={statRows.blocked.toLocaleString()} hint="Requests refused this window" tone="red" />
          </div>

          {/* Policy rows */}
          <div className="bg-white border border-sutra-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sutra-line bg-sutra-bg/60">
                    <Th className="w-[34%]">Policy</Th>
                    <Th>Rate</Th>
                    <Th>Window</Th>
                    <Th>Usage now</Th>
                    <Th>Blocked</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sutra-line">
                  {policies.map((p) => {
                    const editing = editingCode === p.code;
                    return (
                      <Fragment key={p.code}>
                        <tr className="hover:bg-sutra-bg/40 transition-colors align-top">
                          <Td>
                            <div className="flex items-start gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sutra-ink text-[13.5px]">{p.label}</span>
                                  <KindBadge kind={p.kind} />
                                  {p.kind === "specific" && p.path && (
                                    <code className="text-[10.5px] text-sutra-ink-3 bg-sutra-bg border border-sutra-line px-1.5 py-0.5 rounded">{p.method} {p.path}</code>
                                  )}
                                </div>
                                {p.description && <p className="text-[12px] text-sutra-ink-3 mt-0.5">{p.description}</p>}
                                <code className="text-[10.5px] text-navy/70 font-mono">{p.code}</code>
                              </div>
                            </div>
                          </Td>
                          <Td>
                            {editing && isOwner ? (
                              <div className="flex flex-col gap-1.5 w-[150px]">
                                <input
                                  type="number"
                                  min={1}
                                  value={draftLimit}
                                  onChange={(e) => setDraftLimit(e.target.value)}
                                  className="h-8 w-full rounded-lg border border-sutra-line px-2 text-[13px] tabular-nums outline-none focus:border-focus"
                                  aria-label="Requests per window"
                                />
                                <span className="text-[10.5px] text-sutra-ink-3 px-0.5">requests / window</span>
                              </div>
                            ) : (
                              <span className="text-[13.5px] font-semibold tabular-nums text-sutra-ink">{p.limit.toLocaleString()}</span>
                            )}
                          </Td>
                          <Td>
                            {editing && isOwner ? (
                              <div className="flex flex-col gap-1.5 w-[150px]">
                                <input
                                  type="number"
                                  min={1}
                                  value={draftWindow}
                                  onChange={(e) => setDraftWindow(e.target.value)}
                                  className="h-8 w-full rounded-lg border border-sutra-line px-2 text-[13px] tabular-nums outline-none focus:border-focus"
                                  aria-label="Window minutes"
                                />
                                <span className="text-[10.5px] text-sutra-ink-3 px-0.5">minutes per window</span>
                              </div>
                            ) : (
                              <span className="text-[13px] text-sutra-ink-2 whitespace-nowrap">{fmtWindow(p.window_minutes)}</span>
                            )}
                          </Td>
                          <Td>
                            <UsageBar policy={p} />
                            {p.usage.resetInSeconds != null && (
                              <p className="text-[10.5px] text-sutra-ink-3 mt-1 whitespace-nowrap">resets in {p.usage.resetInSeconds}s</p>
                            )}
                          </Td>
                          <Td>
                            {p.usage.blocked > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /></svg>
                                {p.usage.blocked.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[12px] text-sutra-ink-3">—</span>
                            )}
                          </Td>
                          <Td>
                            {isOwner ? (
                              <button
                                onClick={() => togglePolicy(p)}
                                disabled={saving}
                                className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 h-7 rounded-lg border transition-colors disabled:opacity-60 ${
                                  p.enabled
                                    ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                                    : "text-sutra-ink-3 border-sutra-line bg-sutra-bg hover:bg-sutra-line"
                                }`}
                                title={p.enabled ? "Click to pause this policy" : "Click to enable this policy"}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-green-500" : "bg-sutra-ink-3"}`} />
                                {p.enabled ? "Active" : "Paused"}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 h-7 rounded-lg border ${p.enabled ? "text-green-700 border-green-200 bg-green-50" : "text-sutra-ink-3 border-sutra-line bg-sutra-bg"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-green-500" : "bg-sutra-ink-3"}`} />
                                {p.enabled ? "Active" : "Paused"}
                              </span>
                            )}
                          </Td>
                          <Td>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {editing && isOwner ? (
                                <>
                                  <button
                                    onClick={() => savePolicy(p)}
                                    disabled={saving}
                                    className="inline-flex items-center h-7 px-2.5 rounded-lg bg-navy text-white text-[11.5px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                                  >
                                    {saving ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="inline-flex items-center h-7 px-2.5 rounded-lg border border-sutra-line text-[11.5px] font-semibold text-sutra-ink-2 hover:bg-sutra-bg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                isOwner && (
                                  <button
                                    onClick={() => startEdit(p)}
                                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sutra-line text-[11.5px] font-semibold text-sutra-ink-2 hover:border-focus hover:text-sutra-ink transition-colors"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                    Edit
                                  </button>
                                )
                              )}
                              <button
                                onClick={() => resetPolicy(p)}
                                title="Reset this policy's live counters"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sutra-line text-[11.5px] font-semibold text-sutra-ink-2 hover:border-red-200 hover:text-red-600 transition-colors"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                Reset
                              </button>
                              <button
                                onClick={() => toggleClients(p.code)}
                                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-semibold transition-colors ${
                                  expanded === p.code ? "bg-tint text-navy" : "border border-sutra-line text-sutra-ink-2 hover:border-focus hover:text-sutra-ink"
                                }`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Clients
                              </button>
                            </div>
                          </Td>
                        </tr>

                        {expanded === p.code && (
                          <tr>
                            <td colSpan={7} className="px-4 pb-4 bg-sutra-bg/40">
                              <div className="rounded-xl border border-sutra-line bg-white overflow-hidden">
                                {clientsLoading ? (
                                  <p className="p-6 text-center text-[13px] text-sutra-ink-3">Loading top consumers…</p>
                                ) : clients.length === 0 ? (
                                  <p className="p-6 text-center text-[13px] text-sutra-ink-3">
                                    No live counters in this window yet. Users/IPs show up here as they hit {p.code}.
                                  </p>
                                ) : (
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="border-b border-sutra-line bg-sutra-bg/60">
                                        <Th>Identifier</Th>
                                        <Th>Type</Th>
                                        <Th className="text-right">Hits</Th>
                                        <Th>Resets in</Th>
                                        <Th className="text-right">Action</Th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sutra-line">
                                      {clients.map((c) => (
                                        <tr key={`${c.kind}:${c.identifier}`} className="hover:bg-sutra-bg/40 transition-colors">
                                          <Td><code className="text-[12.5px] font-mono text-sutra-ink">{c.identifier}</code></Td>
                                          <Td>
                                            <span className={`inline-flex text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                                              c.kind === "user" ? "bg-tint text-navy border border-tint-2" : "bg-sutra-bg text-sutra-ink-2 border border-sutra-line"
                                            }`}>
                                              {c.kind === "user" ? "User" : "IP"}
                                            </span>
                                          </Td>
                                          <Td className="text-right tabular-nums font-semibold text-sutra-ink">{c.hits.toLocaleString()}</Td>
                                          <Td className="text-sutra-ink-2 text-[13px]">{c.resetInSeconds != null ? `${c.resetInSeconds}s` : "—"}</Td>
                                          <Td className="text-right">
                                            {isOwner && (
                                              <button
                                                onClick={() => resetClient(c)}
                                                className="text-[11.5px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                                              >
                                                Reset {c.kind}
                                              </button>
                                            )}
                                          </Td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-user drill-down */}
          <div className="bg-white border border-sutra-line rounded-xl p-5">
            <h2 className="text-[15px] font-bold text-sutra-ink mb-1">Single user</h2>
            <p className="text-[12.5px] text-sutra-ink-3 mb-4">Look up one user&apos;s live counters across every policy by email.</p>
            <div className="flex items-center gap-2 max-w-xl">
              <div className="flex-1">
                <SearchInput value={email} onChange={setEmail} placeholder="user@example.com" />
              </div>
              <button
                onClick={lookupUser}
                disabled={userLoading || !email.trim()}
                className="inline-flex items-center h-[42px] px-4 rounded-xl bg-navy text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {userLoading ? "Looking up…" : "Look up"}
              </button>
            </div>

            {userRow && (
              <div className="mt-5">
                {userRow.rows.every((r) => r.hits === 0) ? (
                  <p className="text-[13px] text-sutra-ink-3">No live counters for this user right now.</p>
                ) : (
                  <div className="rounded-xl border border-sutra-line overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-sutra-line bg-sutra-bg/60">
                          <Th>Policy</Th>
                          <Th className="text-right">Hits</Th>
                          <Th className="text-right">Limit</Th>
                          <Th className="text-right">Window</Th>
                          <Th>Resets in</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sutra-line">
                        {userRow.rows
                          .filter((r) => r.hits > 0)
                          .map((r) => (
                            <tr key={r.code} className="hover:bg-sutra-bg/40 transition-colors">
                              <Td>
                                <span className="text-[13px] font-medium text-sutra-ink">{r.label}</span>
                                <code className="ml-2 text-[10.5px] text-navy/70 font-mono">{r.code}</code>
                              </Td>
                              <Td className="text-right tabular-nums font-semibold text-sutra-ink">{r.hits.toLocaleString()}</Td>
                              <Td className="text-right tabular-nums text-sutra-ink-2">{r.limit.toLocaleString()}</Td>
                              <Td className="text-right text-sutra-ink-2 whitespace-nowrap">{fmtWindow(r.window_minutes)}</Td>
                              <Td className="text-sutra-ink-2 text-[13px]">{r.resetInSeconds != null ? `${r.resetInSeconds}s` : "—"}</Td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {isOwner && (
                  <button
                    onClick={resetUser}
                    className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-200 text-red-700 text-[12.5px] font-semibold hover:bg-red-50 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    Reset all counters for this user
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
