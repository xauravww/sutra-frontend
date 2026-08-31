"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { admin, type AdminUser, type AdminSubscription, type AdminCase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, StatusBadge, RoleBadge, EmptyState, ErrorState } from "@/components/admin/ui";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const { user: me } = useAuth();
  const { toast } = useNotify();
  const isOwner = me?.role === "owner";
  // Owner manages everyone; admin manages everyone except admins/owners.
  const canManage = (targetRole: string) =>
    me?.role === "owner" || (me?.role === "admin" && targetRole !== "admin" && targetRole !== "owner");

  const [user, setUser] = useState<AdminUser | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    admin
      .getUser(userId)
      .then((r) => {
        setUser(r.data.user);
        setSubscriptions(Array.isArray(r.data.subscriptions) ? r.data.subscriptions : []);
        setCases(Array.isArray(r.data.cases) ? r.data.cases : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load user"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const changeStatus = async (next: string) => {
    if (!user) return;
    try {
      await admin.updateUserStatus(user.id, next);
      toast(`Status set to ${next}`, "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const changeRole = async (next: string) => {
    if (!user) return;
    try {
      await admin.updateUserRole(user.id, next);
      toast("Role updated", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Role update failed", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-sutra-line-2 rounded animate-pulse" />
        <div className="h-48 bg-white border border-sutra-line rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn't load user" message={error} onRetry={load} />;
  }
  if (!user) {
    return <EmptyState title="User not found" description="This user may have been removed." />;
  }

  const fullName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || user.email.split("@")[0];

  return (
    <div>
      <PageHeader
        title={fullName}
        subtitle={user.email}
        actions={
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13.5px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors no-underline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Back to users
          </Link>
        }
      />

      {/* Profile card */}
      <div className="bg-white border border-sutra-line rounded-xl p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-navy text-white grid place-items-center font-bold text-[20px]">
              {user.email.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[19px] font-bold text-sutra-ink">{fullName}</h2>
                <RoleBadge role={user.role} />
                <StatusBadge status={user.account_status} />
              </div>
              <p className="text-[13px] text-sutra-ink-3 mt-1">
                User ID {user.id} · Joined{" "}
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isOwner && (
              <div className="flex items-center gap-2">
                <label className="text-[12.5px] font-semibold text-sutra-ink-2">Role</label>
                <select
                  value={user.role}
                  onChange={(e) => changeRole(e.target.value)}
                  className="h-9 rounded-lg border border-sutra-line bg-white px-2.5 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
                >
                  {["admin", "owner", "corpus_researcher", "corpus_curator", "legal_practitioner", "judiciary"].map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            )}
            {canManage(user.role) && (
              <div className="flex items-center gap-2">
                <label className="text-[12.5px] font-semibold text-sutra-ink-2">Status</label>
                <select
                  value={user.account_status}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="h-9 rounded-lg border border-sutra-line bg-white px-2.5 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
                >
                  {["active", "pending_verification", "suspended", "inactive"].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {user.profile && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-6 pt-5 border-t border-sutra-line-2 text-[13px]">
            {[
              ["Employee ID", user.profile.employee_id],
              ["Designation", user.profile.designation_rank],
              ["Cadre / Service", user.profile.cadre_service],
              ["State", user.profile.state],
              ["District", user.profile.district],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-0.5">{label}</p>
                <p className="text-sutra-ink-2">{value || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscriptions */}
        <section>
          <h3 className="text-[15px] font-bold text-sutra-ink mb-3">Subscriptions</h3>
          {subscriptions.length === 0 ? (
            <EmptyState title="No subscriptions" description="This user has no subscriptions yet." />
          ) : (
            <div className="bg-white border border-sutra-line rounded-xl divide-y divide-sutra-line-2">
              {subscriptions.map((s) => (
                <Link key={s.id} href={`/admin/subscriptions/${s.id}`} className="block px-4 py-3.5 hover:bg-sutra-bg/40 transition-colors no-underline">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[13.5px] font-semibold text-sutra-ink">{s.plan?.name ?? "Plan"}</p>
                      <p className="text-[12px] text-sutra-ink-3">
                        {s.start_date ? new Date(s.start_date).toLocaleDateString("en-IN") : "—"} →{" "}
                        {s.end_date ? new Date(s.end_date).toLocaleDateString("en-IN") : "—"}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Cases */}
        <section>
          <h3 className="text-[15px] font-bold text-sutra-ink mb-3">Cases</h3>
          {cases.length === 0 ? (
            <EmptyState title="No cases" description="This user has no linked cases." />
          ) : (
            <div className="bg-white border border-sutra-line rounded-xl divide-y divide-sutra-line-2">
              {cases.map((c) => (
                <div key={c.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[13.5px] font-semibold text-sutra-ink truncate">{c.case_title}</p>
                    <StatusBadge status={c.status ?? ""} />
                  </div>
                  <p className="text-[12px] text-sutra-ink-3 mt-0.5">
                    {c.updated_at ? "Updated " + new Date(c.updated_at).toLocaleDateString("en-IN") : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
