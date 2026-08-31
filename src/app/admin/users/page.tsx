"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { admin, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  StatusBadge,
  RoleBadge,
  Pagination,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "corpus_researcher", label: "Corpus Researcher" },
  { value: "corpus_curator", label: "Corpus Curator" },
  { value: "legal_practitioner", label: "Legal Practitioner" },
  { value: "judiciary", label: "Judiciary" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { toast, confirm } = useNotify();
  const isOwner = me?.role === "owner";

  // Role hierarchy: owner manages everyone; admin manages everyone except
  // admins/owners (they must not deactivate or re-role their own tier).
  const canManage = (targetRole: string) =>
    me?.role === "owner" || (me?.role === "admin" && targetRole !== "admin" && targetRole !== "owner");

  const createRoles =
    me?.role === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value !== "admin" && r.value !== "owner");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("legal_practitioner");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    admin
      .listUsers({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        account_status: status || undefined,
      })
      .then((r) => {
        setUsers(r.data.data);
        setTotal(r.data.pagination?.total ?? 0);
        setLoadError("");
      })
      .catch((e) => {
        setUsers([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load users");
      })
      .finally(() => setLoading(false));
  }, [page, search, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleStatus = async (u: AdminUser) => {
    const toActive = u.account_status !== "active";
    const ok = await confirm({
      title: `${toActive ? "Activate" : "Deactivate"} ${u.email}`,
      message: toActive
        ? "This user will regain access immediately."
        : "This user will lose access immediately.",
      confirmLabel: toActive ? "Activate" : "Deactivate",
      tone: toActive ? "default" : "danger",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await admin.updateUserStatus(u.id, toActive ? "active" : "inactive");
      toast(toActive ? "User activated" : "User deactivated", "success");
      fetchUsers();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (u: AdminUser, nextRole: string) => {
    const ok = await confirm({
      title: `Change role of ${u.email}`,
      message: `Set role to "${nextRole}"?`,
      confirmLabel: "Change role",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await admin.updateUserRole(u.id, nextRole);
      toast("Role updated", "success");
      fetchUsers();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Role update failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword) return;
    if (!isOwner && (newRole === "admin" || newRole === "owner")) {
      toast("Only the owner can create admin/owner accounts", "error");
      return;
    }
    setCreating(true);
    try {
      await admin.createUser({ email: newEmail.trim(), password: newPassword, role: newRole });
      toast("User created", "success");
      setShowCreate(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("legal_practitioner");
      setPage(1);
      fetchUsers();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create user", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${total.toLocaleString()} total users`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New User
          </button>
        }
      />

      {showCreate && (
        <div className="bg-white border border-sutra-line rounded-xl p-5 mb-6">
          <h3 className="text-[15px] font-bold text-sutra-ink mb-4">Create User</h3>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set initial password"
                className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Role *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
              >
                {createRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create User"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search email or name..." className="flex-1 min-w-[200px]" />
        <FilterSelect value={role} onChange={(v) => { setRole(v); setPage(1); }} options={ROLE_OPTIONS} allLabel="All roles" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} allLabel="All statuses" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/3 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="Couldn't load users" message={loadError} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your filters" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Role</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Subscription</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Joined</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sutra-bg/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none">
                        {(u.profile?.first_name ?? u.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/users/${u.id}`} className="no-underline">
                          <p className="text-[13.5px] font-semibold text-sutra-ink hover:text-navy truncate">
                            {[u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(" ") || "—"}
                          </p>
                          <p className="text-[12px] text-sutra-ink-3 truncate">{u.email}</p>
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {isOwner ? (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={busyId === u.id}
                        className="h-8 rounded-lg border border-sutra-line bg-white px-2 text-[12.5px] text-sutra-ink outline-none focus:border-focus cursor-pointer disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={u.account_status} />
                  </td>
                  <td className="px-4 py-3.5">
                    {u.subscription ? (
                      <span className="text-[12.5px] font-medium text-sutra-ink-2">
                        {u.subscription.plan?.name ?? "Plan"} · <span className="capitalize">{u.subscription.status}</span>
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-sutra-ink-3">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-3 whitespace-nowrap">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {canManage(u.role) && (
                        <button
                          onClick={() => toggleStatus(u)}
                          disabled={busyId === u.id}
                          className={`h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors disabled:opacity-50 ${
                            u.account_status === "active"
                              ? "border-sutra-line bg-white text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                              : "border-green-dot bg-green-bg text-green-ink hover:brightness-95"
                          }`}
                        >
                          {u.account_status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold inline-flex items-center hover:bg-navy hover:text-white transition-colors no-underline"
                      >
                        View
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
