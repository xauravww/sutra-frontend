"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type AdminCase, type AdminUser, type AdminJudicialCase } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  ErrorState,
  StatusBadge,
  Pagination,
  SearchSelect,
  type SearchSelectOption,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

const CASE_STATUSES = [
  { value: "intake", label: "Intake" },
  { value: "awaiting_document_upload", label: "Awaiting Documents" },
  { value: "document_uploaded", label: "Documents Uploaded" },
  { value: "advance_analysis", label: "Advance Analysis" },
  { value: "ai_analysis", label: "AI Analysis" },
  { value: "awaiting_officer_review", label: "Awaiting Officer Review" },
  { value: "awaiting_cvo_review", label: "Awaiting CVO Review" },
  { value: "cvo_reviewed", label: "CVO Reviewed" },
  { value: "awaiting_legal_review", label: "Awaiting Legal Review" },
  { value: "legal_reviewed", label: "Legal Reviewed" },
  { value: "finalized", label: "Finalized" },
  { value: "archived", label: "Archived" },
];

const JUDICIAL_STATUSES = [
  { value: "uploaded", label: "Uploaded" },
  { value: "processing", label: "Processing" },
  { value: "structured", label: "Structured" },
  { value: "failed", label: "Failed" },
];

type CaseKind = "mediation" | "court";

export default function AdminCasesPage() {
  const { toast, confirm } = useNotify();

  // Mediator (mediation/officer) cases
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [total, setTotal] = useState(0);
  // Court (judicial) cases
  const [courtCases, setCourtCases] = useState<AdminJudicialCase[]>([]);
  const [courtTotal, setCourtTotal] = useState(0);

  const [kind, setKind] = useState<CaseKind>("mediation");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [officers, setOfficers] = useState<AdminUser[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOfficer, setNewOfficer] = useState("");
  const [creating, setCreating] = useState(false);

  // Create court case modal
  const [showCourtCreate, setShowCourtCreate] = useState(false);
  const [judges, setJudges] = useState<AdminUser[]>([]);
  const [courtTitle, setCourtTitle] = useState("");
  const [courtNumber, setCourtNumber] = useState("");
  const [courtJudge, setCourtJudge] = useState("");
  const [courtCreating, setCourtCreating] = useState(false);

  // Edit mediation case modal
  const [editFor, setEditFor] = useState<AdminCase | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editOfficer, setEditOfficer] = useState("");
  const [editing, setEditing] = useState(false);

  // Edit court case modal
  const [courtEditFor, setCourtEditFor] = useState<AdminJudicialCase | null>(null);
  const [courtEditTitle, setCourtEditTitle] = useState("");
  const [courtEditNumber, setCourtEditNumber] = useState("");
  const [courtEditJudge, setCourtEditJudge] = useState("");
  const [courtEditing, setCourtEditing] = useState(false);

  const fetchCases = useCallback(() => {
    setLoading(true);
    setLoadError("");
    if (kind === "court") {
      admin
        .listJudicialCases({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status: status || undefined, search: search || undefined })
        .then((r) => {
          setCourtCases(r.data.data);
          setCourtTotal(r.data.total);
        })
        .catch((e) => {
          setCourtCases([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load court cases");
        })
        .finally(() => setLoading(false));
      return;
    }
    admin
      .listCases({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status: status || undefined, search: search || undefined })
      .then((r) => {
        setCases(r.data.data);
        setTotal(r.data.total);
      })
      .catch((e) => {
        setCases([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load cases");
      })
      .finally(() => setLoading(false));
  }, [kind, page, search, status]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const switchKind = (next: CaseKind) => {
    setKind(next);
    setPage(1);
    setStatus("");
    setSearch("");
  };

  const openCreate = async () => {
    setShowCreate(true);
    if (officers.length === 0) {
      admin
        .listUsers({ role: "legal_practitioner", limit: 100 })
        .then((r) => setOfficers(r.data.data))
        .catch(() => setOfficers([]));
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim() || !newOfficer) return;
    setCreating(true);
    try {
      await admin.createCase({ title: newTitle.trim(), description: newDesc.trim(), officer_id: Number(newOfficer) });
      toast("Case created", "success");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewOfficer("");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create case", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (c: AdminCase) => {
    const ok = await confirm({
      title: "Delete case",
      message: `Delete "${c.case_title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deleteCase(c.id);
      toast("Case deleted", "success");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const handleDeleteCourt = async (c: AdminJudicialCase) => {
    const ok = await confirm({
      title: "Delete court case",
      message: `Delete "${c.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deleteJudicialCase(c.id);
      toast("Court case deleted", "success");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const userOpts = (users: AdminUser[]): SearchSelectOption[] =>
    users.map((u) => ({
      id: u.id,
      label: u.email,
      sub: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.role.replace(/_/g, " "),
    }));

  const openCourtCreate = async () => {
    setShowCourtCreate(true);
    if (judges.length === 0) {
      admin
        .listUsers({ role: "judiciary", limit: 100 })
        .then((r) => setJudges(r.data.data))
        .catch(() => setJudges([]));
    }
  };

  const handleCourtCreate = async () => {
    if (!courtTitle.trim() || !courtJudge) return;
    setCourtCreating(true);
    try {
      await admin.createJudicialCase({
        title: courtTitle.trim(),
        case_number: courtNumber.trim() || undefined,
        user_id: Number(courtJudge),
      });
      toast("Court case created", "success");
      setShowCourtCreate(false);
      setCourtTitle("");
      setCourtNumber("");
      setCourtJudge("");
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create court case", "error");
    } finally {
      setCourtCreating(false);
    }
  };

  const openEdit = async (c: AdminCase) => {
    setEditFor(c);
    setEditTitle(c.case_title);
    setEditDesc(c.statement_of_charges ?? "");
    setEditPriority(c.priority ?? "medium");
    setEditOfficer(c.officer_user_id ? String(c.officer_user_id) : "");
    if (officers.length === 0) {
      admin
        .listUsers({ role: "legal_practitioner", limit: 100 })
        .then((r) => setOfficers(r.data.data))
        .catch(() => setOfficers([]));
    }
  };

  const handleEdit = async () => {
    if (!editFor) return;
    setEditing(true);
    try {
      await admin.updateCase(editFor.id, {
        case_title: editTitle.trim(),
        description: editDesc.trim(),
        priority: editPriority || undefined,
        officer_id: editOfficer ? Number(editOfficer) : undefined,
      });
      toast("Case updated", "success");
      setEditFor(null);
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setEditing(false);
    }
  };

  const openCourtEdit = (c: AdminJudicialCase) => {
    setCourtEditFor(c);
    setCourtEditTitle(c.title);
    setCourtEditNumber(c.case_number ?? "");
    setCourtEditJudge(String(c.user?.id ?? ""));
    if (judges.length === 0) {
      admin
        .listUsers({ role: "judiciary", limit: 100 })
        .then((r) => setJudges(r.data.data))
        .catch(() => setJudges([]));
    }
  };

  const handleCourtEdit = async () => {
    if (!courtEditFor) return;
    setCourtEditing(true);
    try {
      await admin.updateJudicialCase(courtEditFor.id, {
        title: courtEditTitle.trim(),
        case_number: courtEditNumber.trim() || null,
        user_id: courtEditJudge ? Number(courtEditJudge) : undefined,
      });
      toast("Court case updated", "success");
      setCourtEditFor(null);
      fetchCases();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setCourtEditing(false);
    }
  };

  const totalShown = kind === "court" ? courtTotal : total;

  return (
    <div>
      <PageHeader
        title="Cases"
        subtitle={`${totalShown.toLocaleString()} total cases`}
        actions={
          kind === "mediation" ? (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Case
            </button>
          ) : (
            <button
              onClick={openCourtCreate}
              className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Court Case
            </button>
          )
        }
      />

      {/* Type toggle: mediator vs court */}
      <div className="flex rounded-xl border border-sutra-line bg-white overflow-hidden mb-6 w-fit">
        <button
          onClick={() => switchKind("mediation")}
          className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors ${
            kind === "mediation" ? "bg-navy text-white" : "text-sutra-ink-2 hover:bg-tint"
          }`}
        >
          Mediator Cases
        </button>
        <button
          onClick={() => switchKind("court")}
          className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors ${
            kind === "court" ? "bg-navy text-white" : "text-sutra-ink-2 hover:bg-tint"
          }`}
        >
          Court Cases
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">Create Case</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">
              Assign the mediation officer who will work the case.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  Case Title <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. State vs. Accused"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  Description <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description / charges"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <SearchSelect
                  label="Mediation Officer"
                  required
                  value={newOfficer}
                  onChange={setNewOfficer}
                  options={userOpts(officers)}
                  placeholder="Search officer..."
                  emptyHint="No practitioner accounts yet — create one in Users first"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Case"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={kind === "court" ? "Search title, case no. or filer..." : "Search title, charges or officer..."}
          className="flex-1 min-w-[200px]"
        />
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={kind === "court" ? JUDICIAL_STATUSES : CASE_STATUSES}
          allLabel={kind === "court" ? "All statuses" : "All statuses"}
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
        <ErrorState
          title={`Couldn't load ${kind === "court" ? "court cases" : "cases"}`}
          message={loadError}
          onRetry={fetchCases}
        />
      ) : kind === "court" ? (
        courtCases.length === 0 ? (
          <EmptyState title="No court cases found" description="Try adjusting your filters" />
        ) : (
          <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Case</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Filed by</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">PDF</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Created</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sutra-line-2">
                {courtCases.map((c) => (
                  <tr key={c.id} className="hover:bg-sutra-bg/40 transition-colors">
                    <td className="px-4 py-3.5 max-w-[300px]">
                      <p className="text-[13.5px] font-semibold text-sutra-ink truncate">#{c.id} {c.title}</p>
                      <p className="text-[11.5px] text-sutra-ink-3 truncate">{c.case_number ?? "No case number"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[180px]">
                      {c.user ? c.user.email : "—"}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={c.status ?? ""} /></td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[160px]">
                      {c.pdf_filename ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-700 flex-shrink-0">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span className="truncate">{c.pdf_filename}</span>
                        </span>
                      ) : (
                        <span className="text-sutra-ink-3">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openCourtEdit(c)}
                          className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCourt(c)}
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
        )
      ) : cases.length === 0 ? (
        <EmptyState title="No cases found" description="Try adjusting your filters" />
      ) : (
        <div className="bg-white border border-sutra-line rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-sutra-line-2 bg-sutra-bg/50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Case</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Officer</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Priority</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-sutra-ink-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sutra-line-2">
              {cases.map((c) => {
                const officer = c.officer;
                return (
                  <tr key={c.id} className="hover:bg-sutra-bg/40 transition-colors">
                    <td className="px-4 py-3.5 max-w-[300px]">
                      <p className="text-[13.5px] font-semibold text-sutra-ink truncate">#{c.id} {c.case_title}</p>
                      <p className="text-[11.5px] text-sutra-ink-3 truncate">{c.statement_of_charges ?? ""}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-sutra-ink-2 truncate max-w-[180px]">
                      {officer ? officer.email : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] capitalize text-sutra-ink-2">{c.priority ?? "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={c.status ?? ""} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={totalShown} onPage={setPage} />

      {showCourtCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCourtCreate(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">Create Court Case</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">
              File on behalf of a judge — pick the judge below.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  Case Title <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={courtTitle}
                  onChange={(e) => setCourtTitle(e.target.value)}
                  placeholder="e.g. State of Maharashtra vs. Rajesh Kumar"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  Case Number
                </label>
                <input
                  type="text"
                  value={courtNumber}
                  onChange={(e) => setCourtNumber(e.target.value)}
                  placeholder="e.g. CRL/118/2026"
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <SearchSelect
                label="Judge"
                required
                value={courtJudge}
                onChange={setCourtJudge}
                options={userOpts(judges)}
                placeholder="Search judge..."
                emptyHint="No judge accounts yet — create one in Users first"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCourtCreate}
                disabled={courtCreating}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {courtCreating ? "Creating..." : "Create Court Case"}
              </button>
              <button
                onClick={() => setShowCourtCreate(false)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editFor && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditFor(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">Edit Case</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">#{editFor.id} · {editFor.case_title}</p>
            <p className="mb-4 text-[12px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Want to edit it in detail? Impersonate the admin account in the Users page.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Case Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <SearchSelect
                  label="Mediation Officer"
                  value={editOfficer}
                  onChange={setEditOfficer}
                  options={userOpts(officers)}
                  placeholder="Search officer..."
                  emptyHint="No practitioner accounts yet — create one in Users first"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleEdit}
                disabled={editing}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {editing ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditFor(null)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {courtEditFor && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCourtEditFor(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-1">Edit Court Case</h3>
            <p className="text-[13px] text-sutra-ink-3 mb-4">#{courtEditFor.id} · {courtEditFor.title}</p>
            <p className="mb-4 text-[12px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Want to edit it in detail? Impersonate the admin account in the Users page.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Case Title</label>
                <input
                  type="text"
                  value={courtEditTitle}
                  onChange={(e) => setCourtEditTitle(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Case Number</label>
                <input
                  type="text"
                  value={courtEditNumber}
                  onChange={(e) => setCourtEditNumber(e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <SearchSelect
                label="Judge"
                value={courtEditJudge}
                onChange={setCourtEditJudge}
                options={userOpts(judges)}
                placeholder="Search judge..."
                emptyHint="No judge accounts yet — create one in Users first"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCourtEdit}
                disabled={courtEditing}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {courtEditing ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setCourtEditFor(null)}
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
