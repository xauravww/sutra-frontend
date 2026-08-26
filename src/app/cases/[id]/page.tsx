"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { Spinner } from "@/components/ui/Button";
import { judicialCases, type JudicialCaseDetail, type JudicialDocument } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import Markdown from "react-markdown";

type Tab = "overview" | "parties" | "witnesses" | "evidence" | "chronology" | "research" | "pages";

/* Quick access cards — one per tab, mirroring the workspace's analysis strip
   so a judge can reach any section of the case in one tap. */
const QUICK_ACCESS: {
  tab: Tab;
  label: string;
  sub: string;
  bg: string;
  icon: React.ReactNode;
}[] = [
  {
    tab: "overview",
    label: "Case Brief",
    sub: "Background & issues",
    bg: "bg-tint text-navy",
    icon: <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />,
  },
  {
    tab: "parties",
    label: "Parties",
    sub: "Accused & parties",
    bg: "bg-tint text-navy",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    tab: "witnesses",
    label: "Witnesses",
    sub: "Names & statements",
    bg: "bg-tint text-navy",
    icon: <path d="M20 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />,
  },
  {
    tab: "evidence",
    label: "Evidence",
    sub: "Exhibits & records",
    bg: "bg-amber-bg text-amber-ink",
    icon: (
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57a4 4 0 0 1 5.66 5.66l-8.58 8.58a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    ),
  },
  {
    tab: "chronology",
    label: "Chronology",
    sub: "Event timeline",
    bg: "bg-tint text-navy",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    tab: "research",
    label: "Research",
    sub: "Acts & precedents",
    bg: "bg-green-bg text-green-ink",
    icon: (
      <>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </>
    ),
  },
  {
    tab: "pages",
    label: "Pages",
    sub: "Page-by-page",
    bg: "bg-tint text-navy",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),
  },
];

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = Number(params.id);
  const { toast, confirm } = useNotify();

  const [caseData, setCaseData] = useState<JudicialCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [quickOpen, setQuickOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabPanelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Inline document viewer (renders the PDF, no new tab) ─── */
  const [viewerDoc, setViewerDoc] = useState<JudicialDocument | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  /* ─── Case Assistant chat ─── */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  /* Select a tab and bring its panel into view — `nearest` leaves the page
     alone when the panel is already on screen. */
  const goToTab = (tab: Tab) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      tabPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const fetchCase = useCallback(async () => {
    try {
      const res = await judicialCases.get(caseId);
      setCaseData(res.data);
    } catch {
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) fetchCase();
  }, [caseId, fetchCase]);

  /* Poll the case while the AI extraction runs, updating the tabs when it
     lands. Guarded so only one interval is ever live. */
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await judicialCases.get(caseId);
        setCaseData(res.data);
        if (res.data.status === "structured" || res.data.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setAnalyzing(false);
          toast(
            res.data.status === "structured"
              ? "Analysis complete — case sections are ready."
              : "Analysis failed. Please run it again.",
            res.data.status === "structured" ? "success" : "error"
          );
        }
      } catch {
        /* transient network error — keep polling */
      }
    }, 5000);
  }, [caseId, toast]);

  /* Resume polling if the case is mid-analysis (e.g. after a reload), and
     always clear the interval on unmount. */
  useEffect(() => {
    if (caseData?.status === "processing") startPolling();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [caseData?.status, startPolling]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (caseId) judicialCases.chatHistory(caseId).then(r => setChatMessages(r.data.map(m => ({ role: m.role, content: m.content })))).catch(() => {});
  }, [caseId]);

  const doChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatMessages(p => [...p, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const r = await judicialCases.chat(caseId, q);
      setChatMessages(p => [...p, { role: "assistant", content: r.data?.answer ?? "No response." }]);
    } catch {
      setChatMessages(p => [...p, { role: "assistant", content: "Failed to get response." }]);
    }
    setChatLoading(false);
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const all = Array.from(fileList);
    const files = all.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    const rejected = all.length - files.length;
    if (rejected > 0) toast(`${rejected} non-PDF file(s) skipped. Only PDF is supported.`, "error");
    if (files.length === 0) return;

    setUploading(true);
    try {
      const res = await judicialCases.uploadDocuments(
        caseId,
        files.map((f) => ({ file: f, docType: "OTHER" }))
      );
      // Server auto-starts extraction; reflect that and poll for the result.
      setCaseData({ ...res.data, status: "processing" });
      toast(`${files.length} document(s) uploaded. Analysis started.`, "success");
      startPolling();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const doAnalyze = async () => {
    if (analyzing) return;
    if ((caseData?.documents?.length ?? 0) === 0) {
      toast("Upload at least one document before running analysis.", "error");
      return;
    }
    setAnalyzing(true);
    try {
      await judicialCases.analyze(caseId);
      setCaseData((p) => (p ? { ...p, status: "processing" } : p));
      toast("Analysis started — this may take a minute. The tabs update when it's ready.", "success");
      startPolling();
    } catch (err) {
      setAnalyzing(false);
      toast(err instanceof Error ? err.message : "Failed to start analysis", "error");
    }
  };

  const deleteDoc = async (docId: string, name: string) => {
    const ok = await confirm({
      title: "Delete document",
      message: `Remove "${name}" from this case?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingDocId(docId);
    try {
      const res = await judicialCases.deleteDocument(caseId, docId);
      setCaseData(res.data);
      toast("Document deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete document", "error");
    } finally {
      setDeletingDocId(null);
    }
  };

  /* Open a document in the inline viewer. The backend returns a short-lived
     presigned URL, so we re-fetch it fresh each time the modal opens. */
  const openViewer = async (doc: JudicialDocument) => {
    if (!doc.file_url) {
      toast("This document has no viewable file.", "error");
      return;
    }
    setViewerDoc(doc);
    setViewerLoading(true);
    setViewerUrl(null);
    try {
      const res = await judicialCases.get(caseId);
      const fresh = res.data.documents?.find((d) => d.id === doc.id);
      setViewerUrl(fresh?.file_url ?? doc.file_url);
    } catch {
      setViewerUrl(doc.file_url);
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerDoc(null);
    setViewerUrl(null);
  };

  /* Esc closes the viewer. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete case",
      message: "Delete this case? This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await judicialCases.delete(caseId);
      router.push("/cases");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete case", "error");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[940px] mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full">
          <div className="space-y-4">
            <div className="h-7 sm:h-8 w-full max-w-[260px] bg-sutra-line-2 rounded animate-pulse" />
            <div className="h-4 w-full max-w-[180px] bg-sutra-line-2 rounded animate-pulse" />
            <div className="h-[300px] sm:h-[400px] bg-white border border-sutra-line rounded-2xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[940px] mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full text-center">
          <p className="text-[17px] text-sutra-ink-3 mb-4">Case not found</p>
          <Link href="/cases" className="text-[15px] font-semibold text-navy hover:underline">
            ← Back to cases
          </Link>
        </main>
      </div>
    );
  }

  /* Extracted-item count per section, shown as a badge on the quick access
     cards. Case Brief is prose, not a list, so it carries no count. */
  const documents = caseData.documents ?? [];
  const hasDocs = documents.length > 0;
  const isProcessing = caseData.status === "processing" || analyzing;
  const isStructured = caseData.status === "structured";
  const listLength = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const counts: Record<Tab, number> = {
    overview: 0,
    parties: listLength(caseData.parties) + listLength(caseData.accused),
    witnesses: listLength(caseData.witnesses),
    evidence: listLength(caseData.evidence),
    chronology: listLength(caseData.chronology),
    research: listLength(caseData.legal_provisions),
    pages: documents.reduce((n, d) => n + (d.page_count || 0), 0),
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />

      <main className="flex-1 max-w-[940px] mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 sm:mb-6">
          <div className="min-w-0">
            <Link
              href="/cases"
              className="text-[13px] font-semibold text-sutra-ink-3 hover:text-navy no-underline mb-2 inline-block"
            >
              ← Cases
            </Link>
            <h1 className="text-[21px] sm:text-[28px] font-bold tracking-tight leading-snug break-words [overflow-wrap:anywhere]">
              {caseData.title}
            </h1>
            {caseData.case_number && (
              <p className="text-[15px] text-sutra-ink-2 mt-1">
                Case No: <span className="font-semibold">{caseData.case_number}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete case"
            className="flex-none w-[42px] h-[42px] border border-sutra-line rounded-xl bg-white text-sutra-ink-3 grid place-items-center hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            {deleting ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            )}
          </button>
        </div>

        {/* Hidden multi-file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Documents manager */}
        <div className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5 mb-4 sm:mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
              Documents{hasDocs ? ` (${documents.length})` : ""}
            </h3>
            {hasDocs && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline disabled:opacity-40 bg-transparent border-0 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
                Add documents
              </button>
            )}
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl px-4 py-6 sm:py-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-navy bg-tint" : "border-sutra-line hover:border-navy hover:bg-tint"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="w-7 h-7 text-navy" />
                <p className="text-[14px] font-semibold text-sutra-ink-2">Uploading…</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-tint text-navy grid place-items-center mx-auto mb-2.5 border border-tint-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-[15px] font-bold text-sutra-ink">
                  {hasDocs ? "Add more documents" : "Upload case documents"}
                </p>
                <p className="text-[13px] text-sutra-ink-2 mt-0.5">
                  Drag &amp; drop PDFs here, or click to browse
                </p>
                <p className="text-[12px] text-sutra-ink-3 mt-1">
                  FIR · Chargesheet · Statements · Evidence · Orders
                </p>
              </>
            )}
          </div>

          {/* Document list */}
          {hasDocs && (
            <ul className="mt-3 space-y-2">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2.5 sm:gap-3 border border-sutra-line rounded-xl px-3 sm:px-3.5 py-2.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5 text-navy flex-none">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] sm:text-[14px] font-semibold text-sutra-ink truncate">
                      {d.original_filename}
                    </p>
                    <p className="text-[11.5px] text-sutra-ink-3">
                      {formatBytes(d.file_size_bytes)}
                      {d.page_count ? ` · ${d.page_count}p` : ""}
                      {d.document_type && d.document_type !== "OTHER" ? ` · ${d.document_type}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => openViewer(d)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-navy hover:underline flex-none bg-transparent border-0 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => deleteDoc(d.id, d.original_filename)}
                    disabled={deletingDocId === d.id}
                    title="Delete document"
                    className="w-8 h-8 flex-none grid place-items-center rounded-lg text-sutra-ink-3 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {deletingDocId === d.id ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-[18px] h-[18px]">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Analysis bar */}
        {hasDocs && (
          <div className="flex items-center gap-3 flex-wrap bg-white border border-sutra-line rounded-2xl px-4 sm:px-5 py-3.5 mb-5 sm:mb-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-none ${
                  isProcessing
                    ? "bg-blue-500 animate-pulse"
                    : isStructured
                    ? "bg-green-dot"
                    : caseData.status === "failed"
                    ? "bg-red-500"
                    : "bg-amber-dot"
                }`}
              />
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-sutra-ink leading-tight">
                  {isProcessing
                    ? "Analyzing case…"
                    : isStructured
                    ? "Analysis ready"
                    : caseData.status === "failed"
                    ? "Analysis failed"
                    : "Not analyzed yet"}
                </p>
                <p className="text-[12px] text-sutra-ink-3">
                  {isProcessing
                    ? "Extracting parties, evidence, chronology & law"
                    : isStructured
                    ? "Sections below are populated from your documents"
                    : "Run analysis to populate the case sections"}
                </p>
              </div>
            </div>
            <span className="flex-1" />
            <button
              onClick={doAnalyze}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 min-h-[44px] transition-colors hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              )}
              {isProcessing ? "Analyzing…" : isStructured ? "Regenerate" : "Run Analysis"}
            </button>
          </div>
        )}

        {/* Quick access + tabs */}
        {hasDocs && (
          <>
            <div className="mb-4 sm:mb-5">
              <button
                onClick={() => setQuickOpen((o) => !o)}
                aria-expanded={quickOpen}
                className="w-full flex items-center gap-2.5 bg-transparent border-0 text-left cursor-pointer group"
              >
                <span className="text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                  Quick access
                </span>
                <span className="flex-1" />
                <span className="text-[12.5px] font-semibold text-sutra-ink-3 group-hover:text-navy transition-colors">
                  {quickOpen ? "Hide" : "Show"}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-[17px] h-[17px] text-sutra-ink-3 transition-transform group-hover:text-navy ${
                    quickOpen ? "" : "-rotate-90"
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {quickOpen && (
                <div className="grid grid-cols-6 gap-2 mt-2.5 max-[1024px]:grid-cols-3 max-[640px]:grid-cols-2">
                  {QUICK_ACCESS.map((q) => (
                    <button
                      key={q.tab}
                      onClick={() => goToTab(q.tab)}
                      aria-current={activeTab === q.tab ? "true" : undefined}
                      className={`relative flex flex-col items-center text-center p-3 rounded-xl border-[1.5px] transition-all cursor-pointer gap-1.5 ${
                        activeTab === q.tab
                          ? "border-navy bg-tint"
                          : "border-sutra-line bg-white hover:border-navy hover:bg-tint"
                      }`}
                    >
                      {counts[q.tab] > 0 && (
                        <span className="absolute top-1.5 right-1.5 text-[10.5px] font-bold leading-none px-1.5 py-0.5 rounded-full bg-tint-2 text-navy border border-[#CFE0F0]">
                          {counts[q.tab]}
                        </span>
                      )}
                      <span className={`w-9 h-9 rounded-[10px] grid place-items-center flex-none ${q.bg}`}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-[19px] h-[19px]"
                        >
                          {q.icon}
                        </svg>
                      </span>
                      <span className="text-[13px] font-bold text-sutra-ink leading-tight">
                        {q.label}
                      </span>
                      <span className="text-[11px] text-sutra-ink-3 font-medium leading-tight max-[640px]:hidden">
                        {q.sub}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tab content */}
            <div
              ref={tabPanelRef}
              className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 min-h-[240px] sm:min-h-[300px] [overflow-wrap:anywhere]"
            >
              {activeTab === "overview" && <OverviewTab data={caseData} />}
              {activeTab === "parties" && <PartiesTab data={caseData} />}
              {activeTab === "witnesses" && <WitnessesTab data={caseData} />}
              {activeTab === "evidence" && <EvidenceTab data={caseData} />}
              {activeTab === "chronology" && <ChronologyTab data={caseData} />}
              {activeTab === "research" && <ResearchTab data={caseData} />}
              {activeTab === "pages" && <PagesTab caseId={caseId} documents={documents} />}
            </div>
          </>
        )}
      </main>

      {/* ═══ Inline document viewer ═══ */}
      {viewerDoc && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#F7F8FB]" role="dialog" aria-modal="true" aria-label={viewerDoc.original_filename}>
          {/* Viewer header */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-sutra-line bg-white flex-none">
            <span className="flex-none w-9 h-9 rounded-[10px] bg-tint text-navy border border-tint-2 grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[18px] h-[18px]">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-[15px] font-bold text-sutra-ink truncate">
                {viewerDoc.original_filename}
              </h4>
              <p className="text-[12.5px] text-sutra-ink-3">
                {viewerDoc.page_count ? `${viewerDoc.page_count} pages` : ""}
                {viewerDoc.file_size_bytes ? ` · ${formatBytes(viewerDoc.file_size_bytes)}` : ""}
                {viewerDoc.document_type && viewerDoc.document_type !== "OTHER" ? ` · ${viewerDoc.document_type}` : ""}
              </p>
            </div>
            <button
              onClick={closeViewer}
              className="flex-none w-9 h-9 rounded-lg border border-sutra-line bg-white text-sutra-ink-3 grid place-items-center hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
              aria-label="Close viewer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Viewer body */}
          <div className="flex-1 min-h-0 relative bg-[#F7F8FB]">
            {viewerLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sutra-ink-3">
                <Spinner className="w-8 h-8 text-navy" />
                <p className="text-[14px] font-semibold">Loading document…</p>
              </div>
            )}
            {viewerUrl && (
              <iframe
                key={viewerUrl}
                src={viewerUrl}
                title={viewerDoc.original_filename}
                className="w-full h-full border-0 bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* ═══ Case Assistant FAB ═══ */}
      <button onClick={() => setChatOpen(!chatOpen)}
        aria-label="Case assistant"
        className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${chatOpen ? "bg-sutra-ink text-white" : "bg-navy text-white hover:bg-navy-dark hover:scale-105 shadow-navy/25"}`}>
        {chatOpen
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-[26px] sm:h-[26px]"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg>}
      </button>

      {!chatOpen && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant" && (
        <span className="fixed bottom-[68px] sm:bottom-[76px] right-5 sm:right-6 z-50 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">1</span>
      )}

      {/* ═══ Case Assistant Panel ═══ */}
      {chatOpen && (
        <div className="fixed bottom-24 sm:bottom-[76px] right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-[min(calc(100vh-140px),560px)] bg-white border border-sutra-line rounded-2xl shadow-2xl shadow-black/10 flex flex-col overflow-hidden animate-in">
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-sutra-line bg-white flex-none">
            <span className="w-9 h-9 rounded-full bg-navy text-white grid place-items-center flex-none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg></span>
            <div className="flex-1 min-w-0"><h4 className="text-[14px] sm:text-[15px] font-bold text-sutra-ink leading-tight">Case Assistant</h4><p className="text-[11px] sm:text-[12px] text-sutra-ink-3">Ask about this case</p></div>
            <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-tint transition-colors text-sutra-ink-3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2.5">
            {chatMessages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-center py-8"><div className="w-12 h-12 rounded-2xl bg-tint text-navy grid place-items-center mb-3 border border-tint-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg></div><p className="text-[13px] sm:text-[14px] font-semibold text-sutra-ink mb-0.5">Start a conversation</p><p className="text-[12px] text-sutra-ink-3">Ask about parties, evidence, chronology, or law.</p></div>)}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed bg-navy text-white rounded-br-md">{m.content}</div>
                : <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed bg-[#F4F6F8] text-sutra-ink border border-sutra-line-2 rounded-bl-md chat-markdown"><Markdown>{m.content}</Markdown></div>}
              </div>
            ))}
            {chatLoading && <div className="flex justify-start"><div className="bg-[#F4F6F8] border border-sutra-line-2 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:300ms]" /></div></div></div>}
            <div ref={chatEnd} />
          </div>
          <div className="px-4 sm:px-5 py-3 border-t border-sutra-line bg-white flex-none">
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doChat(); }} placeholder="Ask about this case…" className="flex-1 min-h-[42px] border border-sutra-line rounded-xl px-4 font-[inherit] text-[13px] sm:text-[14px] text-sutra-ink outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder:text-sutra-ink-3" />
              <button onClick={doChat} disabled={!chatInput.trim() || chatLoading} className="w-10 h-10 rounded-xl bg-navy text-white grid place-items-center flex-none transition-all hover:bg-navy-dark disabled:opacity-40 disabled:cursor-not-allowed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab Components ─── */

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M12 2v20M2 12h20" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[17px] font-semibold text-sutra-ink mb-1">{title}</p>
      <p className="text-[15px] text-sutra-ink-3">{desc}</p>
    </div>
  );
}

function OverviewTab({ data }: { data: JudicialCaseDetail }) {
  const brief = data.case_brief as any;
  if (!brief) {
    return (
      <EmptyState
        title="No case brief yet"
        desc="Run Analysis to generate a case brief from your documents."
      />
    );
  }
  return (
    <div className="space-y-6">
      {brief.background && (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2">Background</h3>
          <p className="text-[15px] text-sutra-ink leading-relaxed">{brief.background}</p>
        </div>
      )}
      {brief.issues && (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2">Key Issues</h3>
          <ul className="text-[15px] text-sutra-ink leading-relaxed pl-5 list-disc space-y-1">
            {(Array.isArray(brief.issues) ? brief.issues : [brief.issues]).map((i: string, idx: number) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      {brief.current_stage && (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2">Current Stage</h3>
          <p className="text-[15px] text-sutra-ink leading-relaxed">{brief.current_stage}</p>
        </div>
      )}
    </div>
  );
}

function PartiesTab({ data }: { data: JudicialCaseDetail }) {
  const parties = (data.parties as any[]) || [];
  const accused = (data.accused as any[]) || [];
  if (!parties.length && !accused.length) {
    return <EmptyState title="No parties identified" desc="Run Analysis to extract parties and accused from your documents." />;
  }
  return (
    <div className="space-y-6">
      {parties.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">Parties</h3>
          <div className="space-y-2">
            {parties.map((p: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0">
                <span className="flex-none w-8 h-8 rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[14px] border border-[#CFE0F0]">
                  {p.role?.[0] || "P"}
                </span>
                <div>
                  <b className="text-[15px]">{p.name || `Party ${i + 1}`}</b>
                  {p.role && <span className="text-[13px] text-sutra-ink-3 ml-2">({p.role})</span>}
                  {p.description && <p className="text-[14px] text-sutra-ink-2 mt-0.5">{p.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {accused.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">Accused</h3>
          <div className="space-y-2">
            {accused.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0">
                <span className="flex-none w-8 h-8 rounded-full bg-red-50 text-red-700 grid place-items-center font-bold text-[14px] border border-red-200">
                  A
                </span>
                <div>
                  <b className="text-[15px]">{a.name || `Accused ${i + 1}`}</b>
                  {a.allegations && <p className="text-[14px] text-sutra-ink-2 mt-0.5">{a.allegations}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WitnessesTab({ data }: { data: JudicialCaseDetail }) {
  const witnesses = (data.witnesses as any[]) || [];
  if (!witnesses.length) {
    return <EmptyState title="No witnesses identified" desc="Run Analysis to extract witness names and statements." />;
  }
  return (
    <div className="space-y-2">
      {witnesses.map((w: any, i: number) => (
        <div key={i} className="flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0">
          <span className="flex-none w-8 h-8 rounded-full bg-tint text-navy grid place-items-center font-bold text-[14px] border border-tint-2">
            W
          </span>
          <div className="flex-1">
            <b className="text-[15px]">{w.name || `Witness ${i + 1}`}</b>
            {w.statement_summary && <p className="text-[14px] text-sutra-ink-2 mt-0.5">{w.statement_summary}</p>}
            {w.page_reference && <span className="text-[12px] text-sutra-ink-3">p. {w.page_reference}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceTab({ data }: { data: JudicialCaseDetail }) {
  const evidence = (data.evidence as any[]) || [];
  if (!evidence.length) {
    return <EmptyState title="No evidence mapped" desc="Run Analysis to classify and map evidence from your documents." />;
  }
  return (
    <div className="space-y-2">
      {evidence.map((e: any, i: number) => (
        <div key={i} className="flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0">
          <span className="flex-none w-8 h-8 rounded-full bg-amber-bg text-amber-ink grid place-items-center font-bold text-[14px] border border-amber-200">
            E
          </span>
          <div className="flex-1">
            <b className="text-[15px]">{e.title || e.type || `Evidence ${i + 1}`}</b>
            {e.description && <p className="text-[14px] text-sutra-ink-2 mt-0.5">{e.description}</p>}
            {e.page_reference && <span className="text-[12px] text-sutra-ink-3">p. {e.page_reference}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChronologyTab({ data }: { data: JudicialCaseDetail }) {
  const chronology = (data.chronology as any[]) || [];
  if (!chronology.length) {
    return <EmptyState title="No chronology yet" desc="Run Analysis to build a timeline from the case events." />;
  }
  return (
    <div className="relative pl-6">
      <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-sutra-line" />
      {chronology.map((c: any, i: number) => (
        <div key={i} className="relative mb-6 last:mb-0">
          <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-navy border-2 border-white" />
          <span className="text-[12px] font-bold text-sutra-ink-3 uppercase tracking-wider">{c.date || c.stage || ""}</span>
          <p className="text-[15px] text-sutra-ink mt-1 leading-relaxed">{c.event || c.description || ""}</p>
          {c.page_reference && <span className="text-[12px] text-sutra-ink-3">p. {c.page_reference}</span>}
        </div>
      ))}
    </div>
  );
}

function ResearchTab({ data }: { data: JudicialCaseDetail }) {
  const provisions = (data.legal_provisions as any[]) || [];
  if (!provisions.length) {
    return <EmptyState title="No legal research yet" desc="Run Analysis to identify relevant acts, sections, and precedents." />;
  }
  return (
    <div className="space-y-3">
      {provisions.map((p: any, i: number) => (
        <div key={i} className="py-3 border-b border-sutra-line-2 last:border-0">
          <b className="text-[15px] text-navy">{p.act || p.title || ""}</b>
          {p.section && <span className="text-[14px] text-sutra-ink-2 ml-2">§ {p.section}</span>}
          {p.description && <p className="text-[14px] text-sutra-ink-2 mt-1">{p.description}</p>}
        </div>
      ))}
    </div>
  );
}

/* ─── Page-by-page summaries ─── */

interface PageSummary {
  page_number: number;
  summary: string;
  status: string;
}

/** How many pages are shown at once in the paginated reader. */
const PAGES_PER_VIEW = 5;

function PagesTab({
  caseId,
  documents,
}: {
  caseId: number;
  documents: JudicialDocument[];
}) {
  const { toast } = useNotify();
  const [activeDocId, setActiveDocId] = useState<string | null>(
    documents[0]?.id ?? null
  );
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [running, setRunning] = useState(false);
  const [openedDocId, setOpenedDocId] = useState<string | null>(null);
  /* First page number shown in the paginated reader window. */
  const [viewStart, setViewStart] = useState(1);
  const cancelRef = useRef(false);
  const followRef = useRef(true);

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  if (!documents.length) {
    return (
      <EmptyState
        title="No documents to summarise"
        desc="Upload a PDF document to this case first."
      />
    );
  }

  const total = activeDoc?.page_count || 0;
  const sortedPages = [...pages].sort((a, b) => a.page_number - b.page_number);
  const completedCount = sortedPages.filter((p) => p.status === "completed").length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const selectDoc = async (docId: string) => {
    cancelRef.current = true;
    setActiveDocId(docId);
    setPages([]);
    setOpenedDocId(null);
    setViewStart(1);
    followRef.current = true;
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    // Show already-stored summaries immediately, if any.
    if (doc.page_summaries?.length) {
      setPages(
        doc.page_summaries
          .map((s) => ({
            page_number: s.page_number,
            summary: s.summary || "",
            status: s.status,
          }))
          .sort((a, b) => a.page_number - b.page_number)
      );
      setOpenedDocId(docId);
    }
  };

  const runSummaries = async () => {
    if (!activeDoc || running) return;
    cancelRef.current = false;
    followRef.current = true;
    setRunning(true);
    setPages([]);
    setOpenedDocId(activeDoc.id);
    setViewStart(1);
    try {
      for (let p = 1; p <= total; p++) {
        if (cancelRef.current) break;
        try {
          const res = await judicialCases.getPageSummary(caseId, activeDoc.id, p);
          setPages((prev) => [
            ...prev.filter((x) => x.page_number !== p),
            { page_number: p, summary: res.data.summary, status: res.data.status },
          ]);
        } catch {
          setPages((prev) => [
            ...prev.filter((x) => x.page_number !== p),
            {
              page_number: p,
              summary: `Summary for page ${p} could not be loaded.`,
              status: "failed",
            },
          ]);
        }
        /* Follow the generation — page the reader forward so the newest
           summary stays on screen. Once the user navigates manually, this
           parks and no longer yanks the view. */
        if (followRef.current) {
          setViewStart(Math.floor((p - 1) / PAGES_PER_VIEW) * PAGES_PER_VIEW + 1);
        }
      }
      toast("Page summaries ready.", "success");
    } finally {
      setRunning(false);
    }
  };

  /* Windowed slice for the paginated reader. */
  const viewPages = sortedPages.filter(
    (p) => p.page_number >= viewStart && p.page_number < viewStart + PAGES_PER_VIEW
  );
  const viewHasPrev = sortedPages.some((p) => p.page_number < viewStart);
  const viewHasNext = sortedPages.some(
    (p) => p.page_number >= viewStart + PAGES_PER_VIEW
  );
  const viewEnd = Math.min(viewStart + PAGES_PER_VIEW - 1, total);

  return (
    <div className="space-y-4">
      {/* Document picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mr-1">
          Document
        </span>
        {documents.map((d) => (
          <button
            key={d.id}
            onClick={() => selectDoc(d.id)}
            disabled={running}
            className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg border-[1.5px] transition-colors disabled:opacity-50 ${
              d.id === activeDocId
                ? "border-navy bg-tint text-navy"
                : "border-sutra-line bg-white text-sutra-ink-2 hover:border-navy hover:bg-tint"
            }`}
          >
            {d.original_filename}
            {d.page_count ? ` (${d.page_count}p)` : ""}
          </button>
        ))}
      </div>

      {/* Generate + linear progress */}
      {activeDoc && total > 0 && (
        <div className="rounded-xl border border-sutra-line bg-white p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-sutra-ink">
                {running
                  ? `Reading page ${Math.min(completedCount + 1, total)} of ${total}…`
                  : openedDocId === activeDoc.id
                  ? `${completedCount} of ${total} pages summarised`
                  : "Generate a summary for every page of this document."}
              </p>
              <p className="text-[12.5px] text-sutra-ink-3">
                {progress}% complete · summaries are saved so you can re-view them anytime
              </p>
            </div>
            <button
              onClick={runSummaries}
              disabled={running}
              className="inline-flex items-center gap-2 bg-navy text-white rounded-xl text-[13.5px] font-semibold px-4 py-2.5 min-h-[42px] transition-colors hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              )}
              {running
                ? "Summarising…"
                : openedDocId === activeDoc.id && completedCount === total
                ? "Regenerate"
                : "Generate page summaries"}
            </button>
          </div>

          {/* Linear progress bar */}
          <div className="h-[5px] bg-sutra-line-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-navy rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Page list */}
      {activeDoc && total === 0 ? (
        <p className="text-[14px] text-sutra-ink-3">
          Page count is unknown for this document.
        </p>
      ) : sortedPages.length === 0 ? (
        <p className="text-[14px] text-sutra-ink-3">
          {running ? "Starting…" : "Page summaries will appear here."}
        </p>
      ) : (
        <div className="bg-white border border-sutra-line rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-sutra-line-2 bg-[#FAFBFD]">
            <p className="text-[12.5px] font-semibold text-sutra-ink-3">
              Pages {viewStart}–{viewEnd} of {total}
            </p>
            {/* Pagination controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  followRef.current = false;
                  setViewStart((v) => Math.max(1, v - PAGES_PER_VIEW));
                }}
                disabled={!viewHasPrev || running}
                aria-label="Previous pages"
                className="w-8 h-8 grid place-items-center rounded-lg border border-sutra-line bg-white text-sutra-ink-2 hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors disabled:opacity-35 disabled:pointer-events-none"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              {/* Jump to page */}
              <select
                value={viewStart}
                onChange={(e) => {
                  followRef.current = false;
                  const p = Number(e.target.value);
                  setViewStart(Math.floor((p - 1) / PAGES_PER_VIEW) * PAGES_PER_VIEW + 1);
                }}
                disabled={running}
                className="h-8 rounded-lg border border-sutra-line bg-white text-[12.5px] font-semibold text-sutra-ink-2 px-2 outline-none focus:border-navy transition-colors disabled:opacity-35"
                aria-label="Jump to page"
              >
                {sortedPages.map((p) => (
                  <option key={p.page_number} value={p.page_number}>
                    p. {p.page_number}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  followRef.current = false;
                  setViewStart((v) => v + PAGES_PER_VIEW);
                }}
                disabled={!viewHasNext || running}
                aria-label="Next pages"
                className="w-8 h-8 grid place-items-center rounded-lg border border-sutra-line bg-white text-sutra-ink-2 hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors disabled:opacity-35 disabled:pointer-events-none"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="divide-y divide-sutra-line-2">
            {viewPages.map((p) => (
              <div key={p.page_number} className="flex items-start gap-3 px-4 py-3.5">
                <span className="flex-none min-w-[52px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
                  p. {p.page_number}
                </span>
                <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
                  {p.summary || "Loading…"}
                </p>
              </div>
            ))}
            {viewPages.length === 0 && (
              <p className="px-4 py-6 text-[14px] text-sutra-ink-3 text-center">
                No summaries in this range yet — keep generating, or jump to a page above.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
