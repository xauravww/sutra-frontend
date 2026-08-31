"use client";

import { useEffect, useState } from "react";
import { systemSettings, admin, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, ErrorState } from "@/components/admin/ui";

export default function AdminSettingsPage() {
  const { toast } = useNotify();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const isOwner = user?.role === "owner";
  const deleteMode = settings.delete_mode === "hard" ? "hard" : "soft";

  // Help desk unassigned-ticket policy (owner-managed)
  const helpdeskMode = settings["helpdesk.unassigned_visibility"] ?? "all";
  let trustedIds: number[] = [];
  try {
    trustedIds = JSON.parse(settings["helpdesk.trusted_admin_ids"] ?? "[]");
  } catch {
    trustedIds = [];
  }

  useEffect(() => {
    if (!isOwner) return;
    admin
      .listUsers({ role: "admin", limit: 100 })
      .then((r) => setAdmins(r.data.data))
      .catch(() => setAdmins([]));
  }, [isOwner]);

  // WhatsApp removed — not surfaced in admin UI anymore.

  const load = () => {
    setLoading(true);
    setLoadError("");
    systemSettings
      .get()
      .then((r) => {
        setSettings((r.data as Record<string, string>) ?? {});
        setLoadError("");
      })
      .catch((e) => {
        setSettings({});
        setLoadError(e instanceof Error ? e.message : "Failed to load settings");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Save a patch to the whole settings object, optimistically updating UI state.
  const savePatch = async (patch: Record<string, string>, msg: string) => {
    setSaving(true);
    try {
      const next = { ...settings, ...patch };
      setSettings(next);
      await systemSettings.update(next);
      toast(msg, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyDeleteMode = (mode: "soft" | "hard") =>
    savePatch({ delete_mode: mode }, `Delete mode set to ${mode}`);

  const applyHelpDesk = (patch: Record<string, string>) =>
    savePatch(patch, "Help desk policy updated");

  // Session timeout (idle logout), applies to every logged-in user.
  const sessionMinutes = settings.session_timeout_minutes ?? "0";
  const saveSessionTimeout = () => {
    const mins = parseInt(sessionMinutes, 10);
    const value = Number.isNaN(mins) || mins < 0 ? "0" : String(mins);
    setSettings((prev) => ({ ...prev, session_timeout_minutes: value }));
    savePatch({ session_timeout_minutes: value }, "Session timeout saved");
  };

  const inputCls =
    "w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy";
  const labelCls = "block text-[13px] font-semibold text-sutra-ink-2 mb-1.5";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Owner-managed system configuration" />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/3 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="Couldn't load settings" message={loadError} onRetry={load} />
      ) : !isOwner ? (
        <div className="bg-white border border-sutra-line rounded-xl p-5">
          <p className="text-[14px] font-bold text-sutra-ink">Settings are managed by the owner</p>
          <p className="text-[13px] text-sutra-ink-3 mt-1 max-w-[480px]">
            Delete mode, help desk access, and session timeout are owner-controlled. Ask the owner
            to make changes here.
          </p>
        </div>
      ) : (
        <>
          {/* Delete mode */}
          <div className="bg-white border border-sutra-line rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-sutra-ink">Delete Mode</h3>
                <p className="text-[13px] text-sutra-ink-3 mt-0.5 max-w-[460px]">
                  Applies to every delete across the system.
                  <span className="block mt-1">
                    <strong className="text-green-ink">Soft</strong> — record is marked deleted,
                    hidden everywhere, data kept and restorable.
                  </span>
                  <span className="block">
                    <strong className="text-red-700">Hard</strong> — record is permanently removed.
                    Not recoverable.
                  </span>
                </p>
              </div>
              <div className="flex rounded-xl border border-sutra-line bg-white overflow-hidden flex-none">
                <button
                  onClick={() => applyDeleteMode("soft")}
                  disabled={saving}
                  className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50 ${
                    deleteMode === "soft" ? "bg-green-ink text-white" : "text-sutra-ink-2 hover:bg-tint"
                  }`}
                >
                  Soft Delete
                </button>
                <button
                  onClick={() => applyDeleteMode("hard")}
                  disabled={saving}
                  className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50 ${
                    deleteMode === "hard" ? "bg-red-600 text-white" : "text-sutra-ink-2 hover:bg-tint"
                  }`}
                >
                  Hard Delete
                </button>
              </div>
            </div>
          </div>

          {/* Help desk access */}
          <div className="bg-white border border-sutra-line rounded-xl p-5 mb-6">
            <h3 className="text-[15px] font-bold text-sutra-ink">Help Desk Access</h3>
            <p className="text-[13px] text-sutra-ink-3 mt-0.5 mb-4 max-w-[520px]">
              Who gets to see tickets that are not assigned to anyone yet. Tickets you assign to a
              specific admin are only visible to that admin and you.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {(
                [
                  ["all", "All admins", "Every admin sees the unassigned queue."],
                  ["trusted", "Owner + trusted admins", "Only admins you mark as trusted below."],
                  ["owner", "Owner only", "Only you see unassigned tickets."],
                ] as const
              ).map(([val, label, desc]) => (
                <button
                  key={val}
                  onClick={() => applyHelpDesk({ "helpdesk.unassigned_visibility": val })}
                  disabled={saving}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                    helpdeskMode === val ? "border-navy bg-tint" : "border-sutra-line bg-white hover:bg-sutra-bg"
                  }`}
                >
                  <p className={`text-[13.5px] font-bold ${helpdeskMode === val ? "text-navy" : "text-sutra-ink"}`}>
                    {label}
                  </p>
                  <p className="text-[12px] text-sutra-ink-3 mt-1">{desc}</p>
                </button>
              ))}
            </div>

            {helpdeskMode === "trusted" && (
              <div>
                <p className="text-[13px] font-semibold text-sutra-ink-2 mb-2">Trusted admins</p>
                <div className="flex flex-wrap gap-2">
                  {admins.map((a) => {
                    const on = trustedIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          const nextIds = on
                            ? trustedIds.filter((x) => x !== a.id)
                            : [...trustedIds, a.id];
                          applyHelpDesk({ "helpdesk.trusted_admin_ids": JSON.stringify(nextIds) });
                        }}
                        disabled={saving}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                          on ? "bg-navy border-navy text-white" : "border-sutra-line bg-white text-sutra-ink-2 hover:bg-tint"
                        }`}
                      >
                        {a.email}
                      </button>
                    );
                  })}
                  {admins.length === 0 && (
                    <p className="text-[12.5px] text-sutra-ink-3">No admin accounts found.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Session timeout */}
          <div className="bg-white border border-sutra-line rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink">Session Timeout</h3>
            <p className="text-[13px] text-sutra-ink-3 mt-0.5 mb-5 max-w-[520px]">
              Minutes of inactivity before any user is signed out automatically. Applies to every
              role — owner, admin, and regular users. Set to 0 to disable auto sign-out.
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label className={labelCls}>Minutes</label>
                <input
                  type="number"
                  min={0}
                  value={sessionMinutes}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, session_timeout_minutes: e.target.value }))
                  }
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <button
                onClick={saveSessionTimeout}
                disabled={saving}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Timeout"}
              </button>
            </div>

            <p className="text-[12px] text-sutra-ink-3 mt-3">
              {Number(sessionMinutes) > 0
                ? `Users will be signed out after ${sessionMinutes} minutes without activity.`
                : "Auto sign-out is disabled. Users stay signed in until they log out."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
