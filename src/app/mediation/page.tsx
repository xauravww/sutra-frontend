"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { mediation, type MediationSession } from "@/lib/api";

export default function MediationDirectoryPage() {
  const [sessions, setSessions] = useState<MediationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [partyA, setPartyA] = useState("");
  const [partyB, setPartyB] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [smartFillFiles, setSmartFillFiles] = useState<File[]>([]);
  const [smartFilling, setSmartFilling] = useState(false);
  const smartFillRef = useRef<HTMLInputElement>(null);

  const fetchSessions = useCallback(() => {
    mediation
      .list()
      .then((res) => setSessions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSmartFill = async () => {
    if (!smartFillFiles.length) return;
    setSmartFilling(true);
    try {
      const res = await mediation.smartFill(smartFillFiles);
      const data = res.data;
      if (data.title) setNewTitle(data.title);
      if (data.party_a_name) setPartyA(data.party_a_name);
      if (data.party_b_name) setPartyB(data.party_b_name);
      setToast({ message: "Auto-filled from documents", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Smart fill failed", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSmartFilling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    setDeletingId(id);
    try {
      await mediation.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setToast({ message: "Session deleted successfully", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete session", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.party_a_name.toLowerCase().includes(q) ||
      s.party_b_name.toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!newTitle.trim() || !partyA.trim() || !partyB.trim()) {
      setError("All fields are required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await mediation.create({
        title: newTitle.trim(),
        party_a_name: partyA.trim(),
        party_b_name: partyB.trim(),
      });
      const newId = res.data?.id;
      // Upload smart fill documents to the new session
      if (newId && smartFillFiles.length > 0) {
        for (const file of smartFillFiles) {
          try {
            await mediation.uploadDocument(newId, file, "PARTY_A");
          } catch {}
        }
      }
      setNewTitle("");
      setPartyA("");
      setPartyB("");
      setSmartFillFiles([]);
      setShowNew(false);
      fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="max-w-[940px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-21">
        {/* Page header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-[24px] sm:text-[33px] font-bold tracking-tight leading-[1.12]">
              Mediation Sessions
            </h1>
            <p className="mt-1 sm:mt-1.5 text-[14px] sm:text-[16px] text-sutra-ink-3">
              Indian Mediation Act, 2023
            </p>
          </div>
          <button
            onClick={() => setShowNew(!showNew)}
            className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-xl text-[15px] sm:text-[17px] font-semibold px-4 sm:px-6 py-2.5 sm:py-3.5 min-h-[44px] sm:min-h-[52px] transition-colors hover:bg-navy-dark"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 sm:w-[22px] sm:h-[22px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">New Session</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* New session form */}
        {showNew && (
          <div className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-sutra-ink mb-4">Create New Session</h3>

            {/* Sample session presets & PDF bundles */}
            <div className="bg-navy text-white rounded-2xl p-4 sm:p-5 mb-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h4 className="text-[12.5px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Realistic Test Cases &amp; Sample PDF Bundles
                </h4>
                <span className="text-[10px] bg-white/15 text-white/80 px-2 py-0.5 rounded font-mono font-bold">
                  Party A + B PDFs
                </span>
              </div>
              <p className="text-[12px] text-white/70 leading-relaxed mb-3">
                Auto-fill a realistic dispute and download the corresponding 4-test-PDF bundle (2 for Party A &amp; 2
                for Party B) to test the AI comparative-analysis engine.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mediation Case 1 preset */}
                <div className="bg-white/10 rounded-xl border border-white/10 p-3 space-y-2 flex flex-col">
                  <div>
                    <h4 className="text-[13px] font-bold text-white">Case 1: Construction Contract</h4>
                    <p className="text-[11.5px] text-white/70 mt-0.5">
                      Shivalik Constructions (Party A) vs. Greenfield Developers (Party B)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle("Construction Contract — Unpaid Certified Bills & Defective Works");
                        setPartyA("M/s Shivalik Constructions Pvt. Ltd.");
                        setPartyB("M/s Greenfield Developers Pvt. Ltd.");
                        setShowNew(true);
                      }}
                      className="px-2.5 py-1 bg-white text-navy rounded-lg text-[10.5px] font-bold transition-colors hover:bg-white/90"
                    >
                      Auto-Fill Case 1
                    </button>
                    <a
                      href="/sample-documents/Mediation_Case1_PartyA_LegalNotice.pdf"
                      download
                      className="px-2 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10.5px] font-bold transition-colors"
                      title="Download Party A notice"
                    >
                      📥 Party A PDF
                    </a>
                    <a
                      href="/sample-documents/Mediation_Case1_PartyB_ReplyNotice.pdf"
                      download
                      className="px-2 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10.5px] font-bold transition-colors"
                      title="Download Party B reply"
                    >
                      📥 Party B PDF
                    </a>
                  </div>
                </div>

                {/* Mediation Case 2 preset */}
                <div className="bg-white/10 rounded-xl border border-white/10 p-3 space-y-2 flex flex-col">
                  <div>
                    <h4 className="text-[13px] font-bold text-white">Case 2: Data Services Dispute</h4>
                    <p className="text-[11.5px] text-white/70 mt-0.5">
                      Orion Analytics (Party A) vs. Vector Systems (Party B)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle("Data Services Agreement — Unpaid Retainer & SLA Breach Counterclaim");
                        setPartyA("M/s Orion Analytics Pvt. Ltd.");
                        setPartyB("M/s Vector Systems Ltd.");
                        setShowNew(true);
                      }}
                      className="px-2.5 py-1 bg-white text-navy rounded-lg text-[10.5px] font-bold transition-colors hover:bg-white/90"
                    >
                      Auto-Fill Case 2
                    </button>
                    <a
                      href="/sample-documents/Mediation_Case2_PartyA_LegalNotice.pdf"
                      download
                      className="px-2 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10.5px] font-bold transition-colors"
                      title="Download Party A notice"
                    >
                      📥 Party A PDF
                    </a>
                    <a
                      href="/sample-documents/Mediation_Case2_PartyB_ReplyNotice.pdf"
                      download
                      className="px-2 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10.5px] font-bold transition-colors"
                      title="Download Party B reply"
                    >
                      📥 Party B PDF
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10">
                <p className="text-[10.5px] text-white/50 leading-relaxed">
                  Full bundle per case (download all, then upload via the session Documents tab):
                  Party A Notice · Party A Evidence · Party B Reply · Party B Evidence — at
                  <span className="font-mono text-white/70"> /sample-documents/ </span>.
                </p>
              </div>
            </div>

            {/* Smart Fill */}
            <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-navy">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                    <path d="M20 3v4M22 5h-4" />
                  </svg>
                  <span className="text-[13px] sm:text-[14px] font-semibold text-sutra-ink">Smart Fill from Documents</span>
                </div>
                {smartFillFiles.length > 0 && <span className="text-[12px] text-sutra-ink-3">{smartFillFiles.length} file{smartFillFiles.length !== 1 ? "s" : ""} selected</span>}
              </div>
              <p className="text-[12px] sm:text-[13px] text-sutra-ink-3 mb-3">Upload case documents and let AI extract party names and dispute details automatically.</p>
              <div className="flex items-center gap-2">
                <input ref={smartFillRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={e => { if (e.target.files?.length) setSmartFillFiles(Array.from(e.target.files)); e.target.value = ""; }} />
                <button type="button" onClick={() => smartFillRef.current?.click()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy bg-white border border-sutra-line rounded-lg px-3 py-1.5 hover:bg-tint hover:border-navy/30 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Choose Files
                </button>
                {smartFillFiles.length > 0 && (
                  <button type="button" onClick={handleSmartFill} disabled={smartFilling} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-navy border-0 rounded-lg px-3 py-1.5 hover:bg-navy-dark transition-colors disabled:opacity-50">
                    {smartFilling ? (<><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="24" strokeLinecap="round" /></svg>Analyzing…</>) : (<>✨ Auto-fill</>) }
                  </button>
                )}
                {smartFillFiles.length > 0 && <button type="button" onClick={() => setSmartFillFiles([])} className="text-[12px] text-sutra-ink-3 hover:text-red-600 transition-colors">Clear</button>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <Input
                label="Session Title"
                name="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Property Dispute - Sharma vs. Verma"
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Party A"
                  name="partyA"
                  value={partyA}
                  onChange={(e) => setPartyA(e.target.value)}
                  placeholder="Applicant / Complainant"
                  required
                />
                <Input
                  label="Party B"
                  name="partyB"
                  value={partyB}
                  onChange={(e) => setPartyB(e.target.value)}
                  placeholder="Respondent / Accused"
                  required
                />
              </div>
            </div>
            {error && <p className="text-[13px] text-red-700 mb-3">{error}</p>}
            <div className="flex gap-3">
              <Button loading={creating} onClick={handleCreate}>
                {creating ? "Creating..." : "Create Session"}
              </Button>
              <button
                onClick={() => setShowNew(false)}
                className="inline-flex items-center justify-center rounded-lg border border-sutra-line bg-white px-5 h-11 text-[14px] sm:text-[15px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 items-center mb-6">
          <label className="flex-1 flex items-center gap-2 sm:gap-3 bg-white border border-sutra-line rounded-xl px-3 sm:px-4 min-h-[48px] sm:min-h-[56px] transition-all focus-within:border-focus focus-within:shadow-[0_0_0_3px_rgba(58,124,192,.15)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-sutra-ink-3 flex-none">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions..."
              className="border-0 bg-transparent outline-none w-full font-[inherit] text-[15px] sm:text-[17px] text-sutra-ink placeholder:text-sutra-ink-3"
            />
          </label>
          <span className="text-[14px] sm:text-[16px] text-sutra-ink-3 whitespace-nowrap flex-none">
            <b className="text-sutra-ink font-bold">{filtered.length}</b> sessions
          </span>
        </div>

        {/* Sessions list */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-6 w-24 bg-sutra-line-2 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-sutra-line-2 rounded-full animate-pulse" />
                  </div>
                  <div className="h-7 w-64 bg-sutra-line-2 rounded animate-pulse mb-3" />
                  <div className="h-4 w-48 bg-sutra-line-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-sutra-line rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-7 sm:h-7">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                </svg>
              </div>
              <p className="text-[16px] sm:text-[17px] font-semibold text-sutra-ink mb-1">No sessions found</p>
              <p className="text-[14px] sm:text-[15px] text-sutra-ink-3">
                {search ? "Try a different search term" : "Click \"New\" to create your first session"}
              </p>
            </div>
          ) : (
            filtered.map((s) => (
              <article
                key={s.id}
                className="relative bg-white border border-sutra-line rounded-2xl p-4 sm:p-[26px_28px_24px] overflow-hidden transition-colors hover:border-[#C7D0DC] group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-navy transform scale-y-0 origin-top transition-transform group-hover:scale-y-100" />

                <div className="flex items-center justify-between gap-2 sm:gap-3.5 mb-2.5 sm:mb-3.5">
                  <span className="text-[13px] sm:text-[15px] font-bold text-navy tracking-wider bg-tint border border-tint-2 py-1 sm:py-1.5 px-2.5 sm:px-3.5 rounded-[8px] sm:rounded-[9px]">
                    MED-{String(s.id).padStart(4, "0")}
                  </span>
                  <StatusBadge status={s.status} />
                </div>

                <h2 className="text-[18px] sm:text-[22px] font-bold leading-snug tracking-tight mb-3 sm:mb-4">
                  {s.title}
                </h2>

                <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl px-3 sm:px-5 mb-4 sm:mb-5">
                  <div className="flex items-center gap-2.5 sm:gap-3.5 py-2.5 sm:py-3.5 border-b border-sutra-line-2 last:border-b-0">
                    <span className="flex-none inline-flex items-center justify-center min-w-[56px] sm:min-w-[70px] h-6 sm:h-7 px-2 sm:px-3 text-[11px] sm:text-[13px] font-bold text-navy uppercase tracking-widest bg-tint border border-tint-2 rounded-[6px] sm:rounded-[7px]">
                      Party A
                    </span>
                    <span className="text-[14px] sm:text-[17px] font-semibold text-sutra-ink truncate">
                      {s.party_a_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3.5 py-2.5 sm:py-3.5">
                    <span className="flex-none inline-flex items-center justify-center min-w-[56px] sm:min-w-[70px] h-6 sm:h-7 px-2 sm:px-3 text-[11px] sm:text-[13px] font-bold text-navy uppercase tracking-widest bg-tint border border-tint-2 rounded-[6px] sm:rounded-[7px]">
                      Party B
                    </span>
                    <span className="text-[14px] sm:text-[17px] font-semibold text-sutra-ink truncate">
                      {s.party_b_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
                  <span className="text-[13px] sm:text-[16px] text-sutra-ink-2">
                    <b className="text-sutra-ink font-bold">
                      {s.documents?.length ?? 0}
                    </b>{" "}
                    docs · Filed{" "}
                    {new Date(s.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDelete({ id: s.id, title: s.title })}
                      disabled={deletingId === s.id}
                      title="Delete session"
                      className="inline-flex items-center justify-center w-[40px] sm:w-[46px] min-h-[40px] sm:min-h-[46px] border-2 border-sutra-line rounded-xl bg-white text-sutra-ink-3 transition-colors hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      {deletingId === s.id ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="24" strokeLinecap="round" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4 sm:w-[18px] sm:h-[18px]">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                    <Link
                      href={`/mediation/${s.id}`}
                      className="inline-flex items-center gap-1.5 sm:gap-2 bg-white text-navy border-2 border-navy rounded-xl text-[14px] sm:text-[16px] font-bold px-3 sm:px-5 py-2 sm:py-2.5 min-h-[40px] sm:min-h-[46px] transition-colors hover:bg-navy hover:text-white no-underline"
                    >
                      Open
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 sm:w-[19px] sm:h-[19px]">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] p-5 sm:p-6 animate-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 grid place-items-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5 text-red-600">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-[17px] sm:text-[18px] font-bold text-sutra-ink text-center mb-1">Delete Session</h3>
            <p className="text-[14px] sm:text-[15px] text-sutra-ink-3 text-center mb-5">
              Are you sure you want to delete <span className="font-semibold text-sutra-ink">"{confirmDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 inline-flex items-center justify-center rounded-xl border border-sutra-line bg-white px-4 py-2.5 text-[14px] sm:text-[15px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white border-0 px-4 py-2.5 text-[14px] sm:text-[15px] font-semibold hover:bg-red-700 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-in">
          <div className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-xl shadow-lg border ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
            {toast.type === "error" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            <span className="text-[13px] sm:text-[14px] font-semibold">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isComplete =
    status === "analyzed" || status === "completed" || status === "in_analysis";
  return (
    <span
      className={`inline-flex items-center gap-1.5 sm:gap-2.5 text-[12px] sm:text-[15px] font-semibold px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full ${
        isComplete ? "bg-green-bg text-green-ink" : "bg-amber-bg text-amber-ink"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-none ${
          isComplete ? "bg-green-dot" : "bg-amber-dot"
        }`}
      />
      {isComplete ? "Complete" : "Pending"}
    </span>
  );
}
