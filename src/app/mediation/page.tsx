"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { mediation, type MediationSession } from "@/lib/api";
import { getSessionStage, type MaybeSession } from "@/lib/mediationStatus";

type QueuedSampleDocument = { file: File; party: "PARTY_A" | "PARTY_B" };

// AUTH-08: read the walkthrough flag from localStorage without breaking hydration.
const subscribeTour = () => () => {};
const readTourSeen = (): boolean => {
  if (typeof window === "undefined") return true;
  try { return window.localStorage.getItem("sutra:walkthrough-done") === "1"; } catch { return false; }
};

export default function MediationDirectoryPage() {
  const [sessions, setSessions] = useState<MediationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);
  const [expandedSampleCase, setExpandedSampleCase] = useState<1 | 2 | null>(null);
  const [selectedSampleCase, setSelectedSampleCase] = useState<1 | 2 | null>(null);
  const [showActInfo, setShowActInfo] = useState(false);
  const [tourDismissed, setTourDismissed] = useState(false);
  const tourSeen = useSyncExternalStore(subscribeTour, readTourSeen, () => true);
  const [newTitle, setNewTitle] = useState("");
  const [partyA, setPartyA] = useState("");
  const [partyB, setPartyB] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [smartFillFiles, setSmartFillFiles] = useState<File[]>([]);
  const [sampleDocuments, setSampleDocuments] = useState<QueuedSampleDocument[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);
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

  // AUTH-08: one-time guided walkthrough. Completed/dismissed once, it never returns.
  const dismissTour = useCallback(() => {
    try { window.localStorage.setItem("sutra:walkthrough-done", "1"); } catch {}
    setTourDismissed(true);
  }, []);
  const showTour = !tourSeen && !tourDismissed && sessions.length === 0;

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

  const applySampleCaseFields = (sampleId: 1 | 2, sessionTitle: string, samplePartyA: string, samplePartyB: string) => {
    setSelectedSampleCase(sampleId);
    setNewTitle(sessionTitle);
    setPartyA(samplePartyA);
    setPartyB(samplePartyB);
  };

  const selectSampleCase = async (
    sampleId: 1 | 2,
    sessionTitle: string,
    samplePartyA: string,
    samplePartyB: string,
    partyAPdf: string,
    partyBPdf: string,
  ) => {
    applySampleCaseFields(sampleId, sessionTitle, samplePartyA, samplePartyB);
    setToast({ message: "Sample case fields filled", type: "success" });
    setTimeout(() => setToast(null), 2500);
    setSampleLoading(true);
    try {
      const documents = await Promise.all([
        { url: partyAPdf, party: "PARTY_A" as const },
        { url: partyBPdf, party: "PARTY_B" as const },
      ].map(async ({ url, party }) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Unable to load sample documents");
        const blob = await response.blob();
        const filename = url.split("/").pop() || "sample-document.pdf";
        return { file: new File([blob], filename, { type: blob.type || "application/pdf" }), party };
      }));
      setSampleDocuments(documents);
    } catch (error: unknown) {
      setSampleDocuments([]);
      setToast({ message: error instanceof Error ? error.message : "Unable to load sample documents", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSampleLoading(false);
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
      if (newId && sampleDocuments.length > 0) {
        for (const { file, party } of sampleDocuments) {
          try {
            await mediation.uploadDocument(newId, file, party);
          } catch {}
        }
      }
      setNewTitle("");
      setPartyA("");
      setPartyB("");
      setSmartFillFiles([]);
      setSampleDocuments([]);
      setSelectedSampleCase(null);
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
            <p className="mt-1 sm:mt-1.5 flex items-center gap-2 text-[14px] sm:text-[16px] text-sutra-ink-3">
              <span>Indian Mediation Act, 2023</span>
              <button
                type="button"
                onClick={() => setShowActInfo(true)}
                aria-label="About the Indian Mediation Act, 2023"
                title="About the Act"
                className="w-5 h-5 rounded-full border border-sutra-line-2 bg-white text-sutra-ink-3 grid place-items-center flex-none cursor-pointer transition-colors hover:text-navy hover:border-navy/40 hover:bg-tint"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            {showNew ? (
              <button
                onClick={() => { setShowNew(false); setShowSampleData(false); setExpandedSampleCase(null); setSelectedSampleCase(null); setSampleDocuments([]); }}
                className="inline-flex items-center gap-1.5 bg-white text-sutra-ink-2 border border-sutra-line rounded-xl text-[14px] sm:text-[16px] font-semibold px-3.5 sm:px-5 py-2.5 sm:py-3.5 min-h-[44px] sm:min-h-[52px] transition-colors hover:bg-tint hover:border-navy/30 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-[18px] sm:h-[18px]"><path d="M15 18l-6-6 6-6" /></svg>
                <span className="hidden sm:inline">Back to Sessions</span>
                <span className="sm:hidden">Back</span>
              </button>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-xl text-[15px] sm:text-[17px] font-semibold px-4 sm:px-6 py-2.5 sm:py-3.5 min-h-[44px] sm:min-h-[52px] transition-colors hover:bg-navy-dark cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 sm:w-[22px] sm:h-[22px]">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden sm:inline">New Session</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>

        {/* AUTH-08: one-time walkthrough (first-time practitioners, no sessions yet) */}
        {showTour && sessions.length === 0 && (
          <div className="bg-white border border-sutra-line border-t-[3px] border-t-navy rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[15px] sm:text-[17px] font-bold text-sutra-ink leading-snug">
                Welcome to Sutra Mediation — here&apos;s the quick path
              </h2>
              <button
                type="button"
                onClick={dismissTour}
                aria-label="Dismiss walkthrough"
                className="w-8 h-8 rounded-lg grid place-items-center text-sutra-ink-3 hover:bg-tint hover:text-navy transition-colors cursor-pointer flex-none"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
            <ol className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              {[
                { n: "1", t: "Create a session", d: "Name the dispute and the two parties, or auto-fill from the sample cases below." },
                { n: "2", t: "Upload documents", d: "Add case files & evidence for Party A and Party B inside the session." },
                { n: "3", t: "Run analysis & settle", d: "The system compares both sides — then chat and draft settlement notes." },
              ].map((s) => (
                <li key={s.n} className="flex gap-2.5 sm:gap-3 flex-1 bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-3">
                  <span className="flex-none w-6 h-6 rounded-full bg-navy text-white grid place-items-center text-[12px] font-bold">{s.n}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] sm:text-[14px] font-semibold text-sutra-ink">{s.t}</span>
                    <span className="block text-[12px] text-sutra-ink-3 mt-0.5 leading-snug">{s.d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={dismissTour}
              className="inline-flex items-center justify-center gap-2 bg-navy text-white border-0 rounded-xl px-5 py-2.5 text-[13px] sm:text-[14px] font-semibold hover:bg-navy-dark transition-colors cursor-pointer"
            >
              Got it — let&apos;s start
            </button>
          </div>
        )}

        {/* New session form */}
        {showNew && (
          <div className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-sutra-ink mb-1.5">Create New Session</h3>
            <p className="text-[12.5px] sm:text-[13px] text-sutra-ink-3 mb-4">
              Everything you enter here can be edited later from the session page — or expanded with more information at any time.
            </p>

            {/* Sample session presets & PDF bundles (collapsed by default) */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowSampleData((open) => !open)}
                aria-expanded={showSampleData}
                className="inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-semibold text-navy hover:underline cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={`w-4 h-4 transition-transform ${showSampleData ? "rotate-90" : ""}`}>
                  <path d="m9 18 6-6-6-6" />
                </svg>
                Confused? Need some sample data? Click here
              </button>

              {showSampleData && (
                <div className="mt-3 space-y-2" aria-label="Sample mediation cases">
                  {sampleLoading && <p className="text-[12px] text-sutra-ink-3">Loading sample documents…</p>}
                  {!sampleLoading && sampleDocuments.length > 0 && <p className="text-[12px] text-green-700">2 sample documents are ready and will be uploaded with this session.</p>}
                  {[
                    {
                      id: 1 as const,
                      title: "Case 1: Construction Contract",
                      parties: "Shivalik Constructions (Party A) vs. Greenfield Developers (Party B)",
                      sessionTitle: "Construction Contract — Unpaid Certified Bills & Defective Works",
                      partyA: "M/s Shivalik Constructions Pvt. Ltd.",
                      partyB: "M/s Greenfield Developers Pvt. Ltd.",
                      partyAPdf: "/sample-documents/Mediation_Case1_PartyA_LegalNotice.pdf",
                      partyBPdf: "/sample-documents/Mediation_Case1_PartyB_ReplyNotice.pdf",
                    },
                    {
                      id: 2 as const,
                      title: "Case 2: Data Services Dispute",
                      parties: "Orion Analytics (Party A) vs. Vector Systems (Party B)",
                      sessionTitle: "Data Services Agreement — Unpaid Retainer & SLA Breach Counterclaim",
                      partyA: "M/s Orion Analytics Pvt. Ltd.",
                      partyB: "M/s Vector Systems Ltd.",
                      partyAPdf: "/sample-documents/Mediation_Case2_PartyA_LegalNotice.pdf",
                      partyBPdf: "/sample-documents/Mediation_Case2_PartyB_ReplyNotice.pdf",
                    },
                  ].map((sample) => (
                    <div
                      key={sample.id}
                      role="radio"
                      aria-checked={selectedSampleCase === sample.id}
                      tabIndex={0}
                      onClick={() => { void selectSampleCase(sample.id, sample.sessionTitle, sample.partyA, sample.partyB, sample.partyAPdf, sample.partyBPdf); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void selectSampleCase(sample.id, sample.sessionTitle, sample.partyA, sample.partyB, sample.partyAPdf, sample.partyBPdf);
                        }
                      }}
                      className={`rounded-xl border bg-[#FAFBFD] overflow-hidden cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 ${selectedSampleCase === sample.id ? "border-navy/50 bg-tint/30" : "border-sutra-line hover:border-navy/30"}`}
                    >
                      <div className="flex items-center gap-2 px-3.5 py-3">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setExpandedSampleCase(expandedSampleCase === sample.id ? null : sample.id); }}
                          aria-label={`${expandedSampleCase === sample.id ? "Hide" : "Show"} details for ${sample.title}`}
                          className="w-7 h-7 rounded-md border border-sutra-line-2 bg-white text-sutra-ink-3 grid place-items-center hover:text-navy hover:border-navy/40 transition-colors cursor-pointer flex-none"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
                        </button>
                        <span className="min-w-0 flex-1 text-[13px] sm:text-[14px] font-semibold text-sutra-ink truncate">{sample.title}</span>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void selectSampleCase(sample.id, sample.sessionTitle, sample.partyA, sample.partyB, sample.partyAPdf, sample.partyBPdf); }}
                          aria-label={`Use ${sample.title}`}
                          title={`Use ${sample.title}`}
                          className="w-7 h-7 rounded-full border-2 border-navy text-navy grid place-items-center hover:bg-navy hover:text-white transition-colors cursor-pointer flex-none"
                        >
                          {selectedSampleCase === sample.id && <span className="w-2 h-2 rounded-full bg-current" />}
                        </button>
                      </div>
                      {expandedSampleCase === sample.id && (
                        <div className="border-t border-sutra-line-2 px-3.5 py-3 text-[12px] text-sutra-ink-3">
                          <p>{sample.parties}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <a href={sample.partyAPdf} download className="text-navy font-semibold hover:underline cursor-pointer">Download Party A PDF</a>
                            <a href={sample.partyBPdf} download className="text-navy font-semibold hover:underline cursor-pointer">Download Party B PDF</a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
              <p className="text-[12px] sm:text-[13px] text-sutra-ink-3 mb-3">Upload case documents and let the system extract party names and dispute details automatically.</p>
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
              {sampleDocuments.length > 0 && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5" aria-live="polite">
                  <p className="text-[12px] font-semibold text-green-800">Sample documents ready to upload with this session</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-green-700">
                    {sampleDocuments.map(({ file, party }) => <li key={file.name}>{party === "PARTY_A" ? "Party A" : "Party B"}: {file.name}</li>)}
                  </ul>
                </div>
              )}
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
              <Button loading={creating} disabled={sampleLoading} onClick={handleCreate}>
                {creating ? "Creating..." : "Create Session"}
              </Button>
              <button
                onClick={() => { setShowNew(false); setShowSampleData(false); setExpandedSampleCase(null); setSelectedSampleCase(null); setSampleDocuments([]); }}
                className="inline-flex items-center justify-center rounded-lg border border-sutra-line bg-white px-5 h-11 text-[14px] sm:text-[15px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showNew && <>
        {/* Controls */}
        <div className="flex flex-col gap-2 mb-6">
          <label className="w-full flex items-center gap-2 sm:gap-3 bg-white border border-sutra-line rounded-xl px-3 sm:px-4 min-h-[48px] sm:min-h-[56px] transition-all focus-within:border-focus focus-within:shadow-[0_0_0_3px_rgba(58,124,192,.15)]">
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
          <p className="text-left text-[12px] sm:text-[13px] text-sutra-ink-3">
            You have created <b className="text-sutra-ink font-semibold">{sessions.length}</b> session{sessions.length !== 1 ? "s" : ""} till now.
          </p>
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
                {search ? "Try a different search term" : "No sessions yet — click \"New Session\" to create your first one."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={() => setShowNew(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline cursor-pointer"
                >
                  Confused? Need some sample data? Click here
                </button>
              )}
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
                  <StatusBadge session={s} />
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
                      type="button"
                      title="Delete session"
                      aria-label={`Delete session ${s.title}`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-transparent text-sutra-ink-3 cursor-pointer transition-colors hover:text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:opacity-40 disabled:cursor-default"
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

        </>}
      </main>

      {/* Act Info Modal (PANEL-03) */}
      {showActInfo && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowActInfo(false)} role="dialog" aria-modal="true" aria-labelledby="act-info-title">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] p-5 sm:p-6 animate-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-tint text-navy grid place-items-center flex-none border border-tint-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-[18px] h-[18px]"><path d="M16 3l5 5-5 5" /><path d="M21 8H9" /><path d="M8 21l-5-5 5-5" /><path d="M3 16h12" /></svg>
                </span>
                <h3 id="act-info-title" className="text-[16px] sm:text-[17px] font-bold text-sutra-ink leading-tight">Indian Mediation Act, 2023</h3>
              </div>
              <button type="button" onClick={() => setShowActInfo(false)} aria-label="Close" className="w-8 h-8 rounded-lg grid place-items-center text-sutra-ink-3 hover:bg-tint hover:text-navy transition-colors cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3 text-[13.5px] sm:text-[14px] leading-relaxed text-sutra-ink-2">
              <p>
                The Mediation Act, 2023 establishes the legal framework for mediation in India — covering pre-litigation mediation, institutional mediation, and enforceability of mediated settlement agreements.
              </p>
              <p>
                Sutra runs structured mediation sessions under this framework: each session records the parties, the dispute, uploaded case documents, a comparative analysis, and any settlement agreement reached.
              </p>
              <p className="text-[12.5px] text-sutra-ink-3">
                This panel reflects the Act&apos;s emphasis on confidentiality and party autonomy — nothing you enter here is shared outside your workspace.
              </p>
            </div>
            <button type="button" onClick={() => setShowActInfo(false)} className="mt-5 w-full inline-flex items-center justify-center rounded-xl bg-navy text-white border-0 px-4 py-2.5 text-[14px] sm:text-[15px] font-semibold hover:bg-navy-dark transition-colors cursor-pointer">Got it</button>
          </div>
        </div>
      )}

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
            <h3 className="text-[17px] sm:text-[18px] font-bold text-sutra-ink text-center mb-4">Delete Session</h3>
            <div className="text-left mb-5">
              <p className="text-[14px] sm:text-[15px] text-sutra-ink-3">Are you sure you want to delete?</p>
              <p className="mt-0.5 text-[15px] sm:text-[16px] font-bold text-sutra-ink truncate" title={confirmDelete.title}>
                {confirmDelete.title}
              </p>
              <p className="mt-2 text-[13px] text-sutra-ink-3">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 inline-flex items-center justify-center rounded-xl border border-sutra-line bg-white px-4 py-2.5 text-[14px] sm:text-[15px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white border-0 px-4 py-2.5 text-[14px] sm:text-[15px] font-semibold hover:bg-red-700 transition-colors cursor-pointer">
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

function StatusBadge({ session }: { session: MaybeSession }) {
  const st = getSessionStage(session);
  const tone =
    st.tone === "green"
      ? "bg-green-bg text-green-ink"
      : st.tone === "slate"
        ? "bg-sutra-line-2 text-sutra-ink-2"
        : st.tone === "navy"
          ? "bg-tint text-navy"
          : "bg-amber-bg text-amber-ink";
  const dot =
    st.tone === "green"
      ? "bg-green-dot"
      : st.tone === "slate"
        ? "bg-sutra-ink-3"
        : st.tone === "navy"
          ? "bg-navy"
          : "bg-amber-dot";
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2.5 text-[12px] sm:text-[15px] font-semibold px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full ${tone}`}>
      <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-none ${dot}`} />
      {st.label}
    </span>
  );
}
