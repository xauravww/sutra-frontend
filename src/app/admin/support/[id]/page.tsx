"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { supportService, type SupportTicket, type TicketMessage } from "@/lib/support";
import { admin, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import { systemSettings } from "@/lib/api";
import { PageHeader, EmptyState, ErrorState } from "@/components/admin/ui";

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

const fmtTime = (d: string) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function AdminSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticketId = Number(id);
  const { toast } = useNotify();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canSeeUnassigned, setCanSeeUnassigned] = useState(false);

  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Assignee combobox state
  const [assignQuery, setAssignQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);
  const assignFiltered =
    assignQuery.trim() === ""
      ? staff
      : staff.filter((s) => s.email.toLowerCase().includes(assignQuery.trim().toLowerCase()));

  // Close the assignee dropdown when clicking outside it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssignOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keep the newest message in view — proper chat behavior: stay pinned to the bottom.
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, ticket?.id]);

  const load = (withMessages = false) => {
    setLoading(true);
    setError("");
    supportService
      .get(ticketId)
      .then((t) => {
        setTicket(t);
        setMessages(t.messages ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load ticket"))
      .finally(() => {
        setLoading(false);
        if (withMessages) {
          supportService.get(ticketId).then((t) => setMessages(t.messages ?? [])).catch(() => undefined);
        }
      });
  };

  useEffect(() => {
    load();
    supportService
      .get(ticketId)
      .then((t) => setMessages(t.messages ?? []))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Poll for new messages every 5s while open
  useEffect(() => {
    const interval = setInterval(() => {
      supportService.get(ticketId).then((t) => setMessages(t.messages ?? [])).catch(() => undefined);
    }, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  const loadStaff = () => {
    if (staff.length > 0) return;
    Promise.all([
      admin.listUsers({ role: "admin", limit: 100 }).catch(() => null),
      admin.listUsers({ role: "owner", limit: 100 }).catch(() => null),
    ]).then((results) => {
      const flat = results
        .filter((r): r is NonNullable<typeof r> => !!r)
        .flatMap((r) => r.data.data);
      setStaff(flat.filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i));
    });
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-owner admins need the owner's policy to know whether they may work
  // on tickets that aren't assigned to them.
  useEffect(() => {
    if (user?.role === "owner") return;
    systemSettings
      .get()
      .then((r) => {
        const s = (r.data as Record<string, string>) ?? {};
        const mode = s["helpdesk.unassigned_visibility"] ?? "all";
        let trusted: number[] = [];
        try {
          trusted = JSON.parse(s["helpdesk.trusted_admin_ids"] ?? "[]");
        } catch {
          trusted = [];
        }
        const canSee =
          mode === "all" ||
          (mode === "trusted" && user?.id != null && trusted.includes(user.id));
        setCanSeeUnassigned(canSee);
      })
      .catch(() => setCanSeeUnassigned(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  // Who may change status on this ticket: owner always; an admin when it's
  // theirs, or when it's unassigned and the owner lets them see unassigned.
  const canManage =
    isOwner ||
    (!!ticket && isAdmin && (ticket.assigned_to === user?.id || (!ticket.assigned_to && canSeeUnassigned)));

  const changeStatus = async (next: string) => {
    if (!ticket) return;
    try {
      await supportService.updateStatus(ticket.id, next);
      toast(`Status set to ${next}`, "success");
      load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const assign = async (assigneeId: number | null) => {
    if (!ticket) return;
    try {
      await supportService.assign(ticket.id, assigneeId);
      toast("Ticket assigned", "success");
      load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Assignment failed", "error");
    }
  };

  const send = async () => {
    if (!ticket || !message.trim()) return;
    setSending(true);
    try {
      await supportService.addMessage(ticket.id, message.trim());
      setMessage("");
      const t = await supportService.get(ticket.id);
      setMessages(t.messages ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-sutra-line-2 rounded animate-pulse" />
        <div className="h-64 bg-white border border-sutra-line rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn't load ticket" message={error} onRetry={() => load(true)} />;
  }
  if (!ticket) {
    return <EmptyState title="Ticket not found" description="This ticket may have been removed." />;
  }

  return (
    <div className="h-[calc(100dvh-6.5rem)] flex flex-col">
      <PageHeader
        title={`#${ticket.id} ${ticket.subject}`}
        subtitle={`${ticket.user?.email ?? "Unknown user"} · opened ${fmtTime(ticket.created_at)}`}
        actions={
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sutra-line bg-white px-4 h-10 text-[13.5px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors no-underline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Back
          </Link>
        }
      />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 flex-1 min-h-0">
        {/* Thread */}
        <div className="bg-white border border-sutra-line rounded-xl overflow-hidden flex flex-col h-full">
          <div className="px-5 py-3.5 border-b border-sutra-line-2 bg-white flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-sutra-ink">Conversation</h3>
            <span className="text-[11.5px] text-sutra-ink-3">
              {messages.length + 1} message{messages.length + 1 === 1 ? "" : "s"}
            </span>
          </div>

          <div className="bg-sutra-bg/60 px-5 py-4 space-y-3.5 flex-1 min-h-0 overflow-y-auto">
            {/* Opener — the user's original message */}
            <div className="flex justify-start">
              <div className="max-w-[78%]">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[11px] font-semibold text-sutra-ink-3 truncate">{ticket.user?.email ?? "User"}</span>
                  <span className="text-[10.5px] text-sutra-ink-3 whitespace-nowrap">{fmtTime(ticket.created_at)}</span>
                </div>
                <p className="bg-white border border-sutra-line text-sutra-ink text-[13.5px] leading-relaxed whitespace-pre-wrap rounded-lg rounded-tl-sm px-3.5 py-2.5">
                  {ticket.description}
                </p>
              </div>
            </div>

            {messages.length === 0 && (
              <p className="text-[12.5px] text-sutra-ink-3 text-center py-4">No replies yet.</p>
            )}
            {messages.map((m) => {
              const staff = m.is_staff;
              return (
                <div key={m.id} className={`flex ${staff ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] flex flex-col ${staff ? "items-end" : "items-start"}`}>
                    <div
                      className={`w-full flex items-baseline gap-3 mb-1 ${staff ? "justify-end" : "justify-start"}`}
                    >
                      <span className="text-[11px] font-semibold text-sutra-ink-3 truncate">
                        {staff ? "Support" : m.sender?.email ?? "User"}
                      </span>
                      <span className="text-[10.5px] text-sutra-ink-3 whitespace-nowrap">{fmtTime(m.created_at)}</span>
                    </div>
                    <p
                      className={`text-[13.5px] leading-relaxed whitespace-pre-wrap rounded-lg px-3.5 py-2.5 ${
                        staff
                          ? "bg-navy text-white rounded-tr-sm"
                          : "bg-white border border-sutra-line text-sutra-ink rounded-tl-sm"
                      }`}
                    >
                      {m.message}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Composer pinned to the bottom of the chat — always visible while scrolling */}
          <div className="px-5 py-3.5 border-t border-sutra-line-2 bg-white flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Type a reply as support staff... (Enter to send)"
              className="flex-1 rounded-lg border border-sutra-line bg-white px-3.5 py-2.5 text-[14px] text-sutra-ink outline-none focus:border-navy resize-none"
            />
            <button
              onClick={send}
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-1.5 bg-navy text-white rounded-lg text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 min-h-0 overflow-y-auto pr-0.5">
          <div className="bg-white border border-sutra-line rounded-xl p-5">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-3">Details</h3>
            <dl className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sutra-ink-3">Status</dt>
                <dd>
                  <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ticketStatusStyle(ticket.status)}`}>
                    {ticket.status.replace(/_/g, " ")}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sutra-ink-3">Priority</dt>
                <dd>
                  <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${PRIORITY_STYLE[ticket.priority] ?? "bg-tint text-navy"}`}>
                    {ticket.priority}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sutra-ink-3">Category</dt>
                <dd className="font-semibold text-sutra-ink capitalize">{ticket.category.replace(/_/g, " ")}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sutra-ink-3">Assignee</dt>
                <dd className="text-sutra-ink-2 truncate max-w-[140px]">{ticket.assignee?.email ?? "Unassigned"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sutra-ink-3">Messages</dt>
                <dd className="font-semibold text-sutra-ink">{ticket._count?.messages ?? messages.length}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-sutra-line rounded-xl p-5">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-sutra-ink-3 mb-3">Actions</h3>
            <div className="space-y-3">
              {canManage ? (
                <div>
                  <label className="block text-[12.5px] font-semibold text-sutra-ink-2 mb-1.5">Status</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => changeStatus(e.target.value)}
                    className="w-full h-10 rounded-lg border border-sutra-line bg-white px-3 text-[13px] text-sutra-ink outline-none focus:border-focus cursor-pointer"
                  >
                    {["open", "in_progress", "resolved", "closed"].map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[12.5px] font-semibold text-sutra-ink-2 mb-1.5">Status</label>
                  <p className="text-[13px] text-sutra-ink-3">
                    Only the assignee or the owner can change this ticket's status.
                  </p>
                </div>
              )}

              {isOwner && (
                <div>
                  <label className="block text-[12.5px] font-semibold text-sutra-ink-2 mb-1.5">Assign to</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1" ref={assignRef}>
                      <input
                        value={assignQuery}
                        onChange={(e) => {
                          setAssignQuery(e.target.value);
                          setAssignOpen(true);
                        }}
                        onFocus={() => setAssignOpen(true)}
                        placeholder={ticket.assignee?.email ?? "Search admin..."}
                        className="w-full h-10 rounded-lg border border-sutra-line bg-white px-3 pr-8 text-[13px] text-sutra-ink outline-none focus:border-navy"
                      />
                      {assignOpen && (
                        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-sutra-line rounded-lg max-h-56 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              assign(null);
                              setAssignQuery("");
                              setAssignOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-[13px] hover:bg-tint"
                          >
                            <span className="font-semibold text-sutra-ink-2">Unassigned</span>
                            {!ticket.assigned_to && (
                              <span className="float-right text-[11px] text-navy font-bold">Current</span>
                            )}
                          </button>
                          {assignFiltered.map((s) => {
                            const active = s.id === ticket.assigned_to;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  assign(s.id);
                                  setAssignQuery("");
                                  setAssignOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-tint"
                              >
                                <span
                                  className={`block truncate text-[13px] ${active ? "font-bold text-navy" : "text-sutra-ink"}`}
                                >
                                  {s.email}
                                </span>
                                <span className="block text-[11px] text-sutra-ink-3 capitalize">
                                  {s.role.replace(/_/g, " ")}
                                </span>
                              </button>
                            );
                          })}
                          {assignFiltered.length === 0 && (
                            <p className="px-3 py-2.5 text-[12.5px] text-sutra-ink-3">No admin found</p>
                          )}
                        </div>
                      )}
                    </div>
                    {ticket.assigned_to && (
                      <button
                        onClick={() => assign(null)}
                        className="h-10 px-3 rounded-lg border border-sutra-line bg-white text-[12.5px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                        title="Unassign"
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
