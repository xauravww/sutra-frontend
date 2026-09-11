"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { Spinner } from "@/components/ui/Button";
import { judicialCases, ApiError, type JudicialCaseDetail, type JudicialDocument, type JudicialCaseCard } from "@/lib/api";
import { corpusService, type CorpusSearchHit } from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import Markdown from "react-markdown";

type Tab = "overview" | "parties" | "witnesses" | "evidence" | "chronology" | "research" | "pages" | "police" | "courts";
type DocumentAnalysisState = "pending" | "analyzing" | "complete" | "failed";

function isCorpusAuthority(hit: CorpusSearchHit): boolean {
  const type = String(hit.case_type || "").toLowerCase();
  const title = String(hit.title || "").toLowerCase().replace(/[^a-z]/g, "");
  return type === "constitution" || type.includes("statute") || type.includes("act") ||
    title.includes("constitution") || title.includes("coonstitution") || title.includes("constitutionaltext") ||
    title.includes("bareact") || title.includes("statutebook") || title.includes("legalcode");
}

const SAMPLE_CASES = [
  {
    id: 1,
    title: "Case 1: Cheating & Forgery",
    summary: "State of Maharashtra vs. Rajesh Kumar — IPC 420, 467, 468, 471 r/w 120B",
    files: [
      "/sample-documents/Judge_Case1_FIR_FirstInformationReport.pdf",
      "/sample-documents/Judge_Case1_ChargeSheet_FinalReport.pdf",
      "/sample-documents/Judge_Case1_WitnessStatements.pdf",
      "/sample-documents/Judge_Case1_Evidence_Exhibits.pdf",
      "/sample-documents/Judge_Case1_BailOrder.pdf",
    ],
  },
  {
    id: 2,
    title: "Case 2: Bank Fraud (CBI)",
    summary: "State (CBI) vs. Suresh Yadav & Ors. — IPC 408, 409, 420, 471 r/w 120B",
    files: [
      "/sample-documents/Judge_Case2_FIR_FirstInformationReport.pdf",
      "/sample-documents/Judge_Case2_ChargeSheet_FinalReport.pdf",
      "/sample-documents/Judge_Case2_WitnessStatements.pdf",
      "/sample-documents/Judge_Case2_Evidence_Exhibits.pdf",
      "/sample-documents/Judge_Case2_FramingOfCharges_Order.pdf",
    ],
  },
] as const;

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
  {
    tab: "police",
    label: "Police / IO",
    sub: "Station & officer",
    bg: "bg-tint text-navy",
    icon: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-4h6v4" />
      </>
    ),
  },
  {
    tab: "courts",
    label: "Courts",
    sub: "Court trail",
    bg: "bg-tint text-navy",
    icon: (
      <>
        <path d="M3 21h18" />
        <path d="M4 21V8l-2 3h4l-2-3v13" />
        <path d="M12 21V4" />
        <path d="M8 21v-8h8v8" />
        <path d="M20 21V8l-2 3h4l-2-3v13" />
      </>
    ),
  },
];

/* Icon palette for user-defined cards. */
const CARD_ICONS: Record<string, React.ReactNode> = {
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  search: (
    <>
      <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />,
  gavel: (
    <>
      <path d="m14 13-8.5 8.5a2.12 2.12 0 1 1-3-3L11 10" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M5 7h14" />
      <path d="m6 7 2.5 8h7L18 7" />
      <path d="m4 11 2-4 2 4" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </>
  ),
};

const CARD_COLORS: { value: string; label: string; swatch: string }[] = [
  { value: "bg-tint text-navy", label: "Blue", swatch: "bg-tint" },
  { value: "bg-amber-bg text-amber-ink", label: "Amber", swatch: "bg-amber-bg" },
  { value: "bg-green-bg text-green-ink", label: "Green", swatch: "bg-green-bg" },
  { value: "bg-red-50 text-red-700", label: "Red", swatch: "bg-red-50" },
  { value: "bg-[#F0EFFB] text-[#4F46E5]", label: "Violet", swatch: "bg-[#F0EFFB]" },
  { value: "bg-slate-100 text-slate-700", label: "Grey", swatch: "bg-slate-100" },
];

const TAB_OPTIONS: { tab: Tab; label: string }[] = [
  { tab: "overview", label: "Case Brief" },
  { tab: "parties", label: "Parties" },
  { tab: "witnesses", label: "Witnesses" },
  { tab: "evidence", label: "Evidence" },
  { tab: "chronology", label: "Chronology" },
  { tab: "research", label: "Research" },
  { tab: "pages", label: "Pages" },
  { tab: "police", label: "Police / IO" },
  { tab: "courts", label: "Courts" },
];

/** Human label for an item deep-link target, e.g. "Party 2 — Rajesh Kumar Mehta". */
function itemLabel(data: JudicialCaseDetail, tab: Tab, index: number): string {
  const name = (v: unknown) => (v && typeof v === "object" && "name" in v && typeof (v as { name?: unknown }).name === "string" ? (v as { name: string }).name : "");
  let list: unknown[] = [];
  if (tab === "parties") list = [...(data.parties as unknown[] | undefined) ?? [], ...(data.accused as unknown[] | undefined) ?? []];
  else if (tab === "witnesses") list = (data.witnesses as unknown[] | undefined) ?? [];
  else if (tab === "evidence") list = (data.evidence as unknown[] | undefined) ?? [];
  else if (tab === "chronology") list = (data.chronology as unknown[] | undefined) ?? [];
  else if (tab === "research") list = (data.legal_provisions as unknown[] | undefined) ?? [];
  else if (tab === "courts") list = (data.court_history as unknown[] | undefined) ?? [];
  const item = list[index];
  if (!item) return `Item ${index + 1}`;
  return name(item) || `Item ${index + 1}`;
}

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
  const [showSampleData, setShowSampleData] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [expandedSampleCase, setExpandedSampleCase] = useState<number | null>(null);
  const [selectedSampleCase, setSelectedSampleCase] = useState<number | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [documentAnalysis, setDocumentAnalysis] = useState<Record<string, DocumentAnalysisState>>({});
  const [analysisChoiceOpen, setAnalysisChoiceOpen] = useState(false);
  const [relatedCorpusCases, setRelatedCorpusCases] = useState<CorpusSearchHit[]>([]);
  const [authorityCorpusSources, setAuthorityCorpusSources] = useState<CorpusSearchHit[]>([]);
  const [relatedCorpusLoading, setRelatedCorpusLoading] = useState(false);
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

  /* ─── Inline knowledge-base source viewer (page-accurate references) ─── */
  const [sourceViewer, setSourceViewer] = useState<{ url: string; title: string } | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  /* ─── Case Assistant chat ─── */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  // `retry` holds the question a failed reply belongs to, so the bubble can
  // offer a Retry that re-asks it (bug #1662).
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string; failed?: boolean; retry?: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  // True once a reply has been pending long enough to warrant saying so.
  const [chatSlow, setChatSlow] = useState(false);
  const chatSlowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chatEnd = useRef<HTMLDivElement>(null);

  /* ─── User-defined quick access cards ─── */
  const [cards, setCards] = useState<JudicialCaseCard[]>([]);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<JudicialCaseCard | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  /* Deep-link highlight: { tab, index } of an item to flash after jumping. */
  const [highlight, setHighlight] = useState<{ tab: Tab; index: number; nonce: number } | null>(null);
  const highlightNonce = useRef(0);

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
      if (res.data.status === "processing" && res.data.documents?.length) {
        setDocumentAnalysis((current) => {
          if (Object.keys(current).length > 0) return current;
          return Object.fromEntries(
            (res.data.documents ?? []).map((doc, index) => [doc.id, index === 0 ? "analyzing" : "pending"])
          );
        });
      }
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
        if (res.data.documents?.length) {
          setDocumentAnalysis((current) => {
            if (res.data.status === "structured" || res.data.status === "failed") {
              return Object.fromEntries((res.data.documents ?? []).map((doc) => [
                doc.id,
                current[doc.id] === "complete" || (doc.page_summaries?.length ?? 0) > 0
                  ? "complete"
                  : res.data.status === "structured" ? "complete" : "failed",
              ]));
            }
            if (Object.keys(current).length > 0) return current;
            return Object.fromEntries((res.data.documents ?? []).map((doc, index) => [
              doc.id,
              index === 0 ? "analyzing" : "pending",
            ]));
          });
        }
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

  useEffect(() => {
    if (caseId) judicialCases.listCards(caseId).then(r => setCards(r.data)).catch(() => {});
  }, [caseId]);

  useEffect(() => {
    const query = caseData
      ? [caseData.title, caseData.case_number].filter(Boolean).join(" ").trim()
      : "";
    if (query.length < 2) {
      setRelatedCorpusCases([]);
      setRelatedCorpusLoading(false);
      return;
    }

    let cancelled = false;
    setRelatedCorpusLoading(true);
    void corpusService.search({ query: query.slice(0, 500), limit: 8, rerank: true })
      .then(({ hits }) => {
        if (cancelled) return;
        const unique = hits.filter((hit, index, all) =>
          all.findIndex((candidate) => candidate.document_id === hit.document_id) === index
        );
        setAuthorityCorpusSources(unique.filter((hit) => isCorpusAuthority(hit)).slice(0, 3));
        const caseOnly = unique.filter((hit) => !isCorpusAuthority(hit));
        setRelatedCorpusCases(caseOnly.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRelatedCorpusCases([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedCorpusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [caseData?.title, caseData?.case_number]);

  const sendChatQuery = async (q: string) => {
    const query = q.trim();
    if (!query || chatLoading) return;
    setChatMessages(p => [...p, { role: "user", content: query }]);
    setChatLoading(true);
    // Long model calls legitimately take a while; say so at 15s rather than
    // leaving three bouncing dots as the only signal (bug #1662).
    setChatSlow(false);
    chatSlowTimer.current = setTimeout(() => setChatSlow(true), 15_000);
    try {
      const r = await judicialCases.chat(caseId, query);
      setChatMessages(p => [...p, { role: "assistant", content: r.data?.answer ?? "No response." }]);
    } catch (err) {
      // Keep the server's own explanation (timeout, 401, 500 body message)
      // instead of collapsing every failure into one generic line.
      const reason = err instanceof ApiError && err.message ? err.message : "Failed to get response.";
      setChatMessages(p => [...p, { role: "assistant", content: reason, failed: true, retry: query }]);
    } finally {
      clearTimeout(chatSlowTimer.current);
      setChatSlow(false);
      setChatLoading(false);
    }
  };

  /* Re-ask the question a failed reply belonged to, dropping the error bubble. */
  const retryChat = (query: string) => {
    if (chatLoading) return;
    setChatMessages(p => {
      const next = [...p];
      while (next.length && next[next.length - 1].retry) next.pop();
      return next;
    });
    sendChatQuery(query);
  };

  const doChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    await sendChatQuery(q);
  };

  /* Run a user-defined card: chat | tab | folio | item. */
  const runCustomCard = (card: JudicialCaseCard) => {
    const v = card.action_value;
    switch (card.action_type) {
      case "chat":
        setChatOpen(true);
        setChatInput(v.query ?? "");
        sendChatQuery(v.query ?? "");
        break;
      case "tab":
        goToTab((v.tab as Tab) ?? "overview");
        break;
      case "folio": {
        const doc = documents.find((d) => d.id === v.docId);
        if (!doc) {
          toast("The document for this card no longer exists.", "error");
          return;
        }
        openViewer(doc, v.page);
        break;
      }
      case "item":
        goToTab((v.tab as Tab) ?? "parties");
        setHighlight({ tab: (v.tab as Tab) ?? "parties", index: v.index ?? 0, nonce: ++highlightNonce.current });
        break;
    }
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
      setDocumentAnalysis(Object.fromEntries(
        (res.data.documents ?? []).map((doc, index) => [doc.id, index === 0 ? "analyzing" : "pending"])
      ));
      toast(`${files.length} document(s) uploaded. Analysis started.`, "success");
      startPolling();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const selectSampleCase = async (sample: (typeof SAMPLE_CASES)[number]) => {
    if (sampleLoading || uploading) return;
    setSelectedSampleCase(sample.id);
    setSampleLoading(true);
    try {
      const files = await Promise.all(
        sample.files.map(async (path) => {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`Could not load ${path.split("/").pop()}`);
          const blob = await response.blob();
          return new File([blob], path.split("/").pop() || "sample-case.pdf", { type: "application/pdf" });
        })
      );
      await handleFiles(files);
    } catch (err) {
      setSelectedSampleCase(null);
      toast(err instanceof Error ? err.message : "Could not load sample case", "error");
    } finally {
      setSampleLoading(false);
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

  const analyzeDocument = async (doc: JudicialDocument) => {
    if (documentAnalysis[doc.id] === "analyzing") return;
    setDocumentAnalysis((current) => ({ ...current, [doc.id]: "analyzing" }));
    try {
      const res = await judicialCases.summarizeAllPages(caseId, doc.id);
      setCaseData((current) => current
        ? {
            ...current,
            documents: (current.documents ?? []).map((item) =>
              item.id === doc.id ? { ...item, page_summaries: res.data } : item
            ),
          }
        : current);
      setDocumentAnalysis((current) => ({ ...current, [doc.id]: "complete" }));
      toast(`${doc.original_filename} analyzed successfully.`, "success");
    } catch (err) {
      setDocumentAnalysis((current) => ({ ...current, [doc.id]: "failed" }));
      toast(err instanceof Error ? err.message : "Document analysis failed", "error");
    }
  };

  /* Open a document in the inline viewer. The backend returns a short-lived
     presigned URL, so we re-fetch it fresh each time the modal opens. An
     optional page appends #page=N so browser PDF viewers jump straight there. */
  const openViewer = async (doc: JudicialDocument, page?: number) => {
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
      const base = fresh?.file_url ?? doc.file_url;
      setViewerUrl(page ? `${base}#page=${page}` : base);
    } catch {
      setViewerUrl(page ? `${doc.file_url}#page=${page}` : doc.file_url);
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerDoc(null);
    setViewerUrl(null);
  };

  /* Open a published knowledge-base source in the inline viewer, jumping to an
     exact page when one is known. Page numbers are anchored to the *ingested*
     PDF, so we view that presigned copy; if it is missing we fall back to the
     external source_url, and if neither exists we surface an error. A fresh
     presigned URL is fetched each open. */
  const openSource = async (documentId: number, page?: number | null) => {
    setSourceViewer({ url: "", title: "Loading source…" });
    setSourceLoading(true);
    try {
      const src = await corpusService.getPublishedSource(documentId);
      const base = src.pdf_url ?? src.source_url;
      if (!base) {
        toast("This source has no viewable document.", "error");
        setSourceViewer(null);
        return;
      }
      setSourceViewer({
        url: page ? `${base}#page=${page}` : base,
        title: src.title || src.citation || "Source",
      });
      void corpusService
        .recordSourceClick({ query: caseId ? `case ${caseId} reference` : "reference", document_id: documentId, result_count: 1 })
        .catch(() => {});
    } catch {
      toast("Could not open this source.", "error");
      setSourceViewer(null);
    } finally {
      setSourceLoading(false);
    }
  };

  const closeSource = () => setSourceViewer(null);

  /* Esc closes the viewer. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeViewer();
        closeSource();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Deep-link highlight: once the target tab renders, scroll to the item and
     flash it, then clear the highlight shortly after. */
  useEffect(() => {
    if (!highlight) return;
    const scrollTimer = setTimeout(() => {
      const el = tabPanelRef.current?.querySelector(`[data-item-idx="${highlight.index}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 450);
    const clearTimer = setTimeout(() => setHighlight(null), 2800);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlight]);

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

  /* Save (create or update) a user-defined card. */
  const saveCard = async (input: {
    label: string;
    subtitle?: string;
    action_type: JudicialCaseCard["action_type"];
    action_value: JudicialCaseCard["action_value"];
    icon: string;
    color: string;
  }) => {
    setSavingCard(true);
    try {
      if (editingCard) {
        const res = await judicialCases.updateCard(caseId, editingCard.id, input);
        setCards((prev) => prev.map((c) => (c.id === editingCard.id ? res.data : c)));
        toast("Card updated", "success");
      } else {
        const res = await judicialCases.createCard(caseId, { ...input, sort_order: cards.length });
        setCards((prev) => [...prev, res.data]);
        toast("Card created", "success");
      }
      setCardModalOpen(false);
      setEditingCard(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save card", "error");
    } finally {
      setSavingCard(false);
    }
  };

  const deleteCard = async (card: JudicialCaseCard) => {
    const ok = await confirm({
      title: "Delete card",
      message: `Remove "${card.label}" from this case?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await judicialCases.deleteCard(caseId, card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      toast("Card deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete card", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main id="main-content" tabIndex={-1} className="max-w-[940px] mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full">
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
        <main id="main-content" tabIndex={-1} className="max-w-[940px] mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full text-center">
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
  const allDocumentsAnalyzed = hasDocs && documents.every((doc) => (doc.page_summaries?.length ?? 0) > 0);
  const visibleRelatedCorpusCases = relatedCorpusCases.filter((hit) => !isCorpusAuthority(hit));

  const listLength = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const counts: Record<Tab, number> = {
    overview: 0,
    parties: listLength(caseData.parties) + listLength(caseData.accused),
    witnesses: listLength(caseData.witnesses),
    evidence: listLength(caseData.evidence),
    chronology: listLength(caseData.chronology),
    research: listLength(caseData.legal_provisions),
    pages: documents.reduce((n, d) => n + (d.page_count || 0), 0),
    police: caseData.police_station ? 1 : 0,
    courts: listLength(caseData.court_history),
  };
  // True only while a case-level structure run is in flight and nothing has
  // been written yet — first analysis after upload, or a retry after a
  // failure. Shows an "Analyzing…" panel in every section tab (mirroring the
  // per-document spinner rows) instead of a misleading "Run analysis" empty
  // state. A regeneration keeps its already-populated content, so the tabs
  // stay visible then and only the top analysis bar shows the run.
  const caseHasStructuredContent =
    !!caseData.case_brief ||
    listLength(caseData.parties) > 0 ||
    listLength(caseData.accused) > 0 ||
    listLength(caseData.witnesses) > 0 ||
    listLength(caseData.evidence) > 0 ||
    listLength(caseData.chronology) > 0 ||
    listLength(caseData.legal_provisions) > 0 ||
    listLength(caseData.court_history) > 0;
  const showAnalysisLoading = isProcessing && !isStructured && !caseHasStructuredContent;
  const getDocumentAnalysisState = (doc: JudicialDocument): DocumentAnalysisState => {
    const hasSummaries = (doc.page_summaries?.length ?? 0) > 0;
    const mapped = documentAnalysis[doc.id];
    // A live per-doc operation (isProcessing false) wins so the in-flight
    // spinner shows. Otherwise already-summarised docs are "complete" even
    // while the case-level structure is regenerating or after a reload mid-run
    // (the mount-time map marks docs analyzing/pending even though they're done).
    if (mapped && (!isProcessing || !hasSummaries)) return mapped;
    if (hasSummaries || isStructured) return "complete";
    if (isProcessing) return "analyzing";
    if (caseData.status === "failed") return "failed";
    return "pending";
  };
  const retryableDocuments = documents.filter((doc) => {
    const state = getDocumentAnalysisState(doc);
    return state === "failed" || state === "pending";
  });
  // Gate for the Run Case Analysis button. The button is always visible but
  // stays disabled (with a tooltip) until at least one document has per-page
  // summaries — only then does running case analysis make sense, since it
  // builds the section cards from those summaries.
  const anyDocumentAnalyzed = documents.some((doc) => getDocumentAnalysisState(doc) === "complete");
  const analysisTooltip = isProcessing
    ? "Analysis is running — you can leave this page."
    : !anyDocumentAnalyzed
    ? "Please upload and analyze at least one document to generate the summary of these cards."
    : "";
  const runSelectedAnalysis = async (scope: "all" | "failed") => {
    setAnalysisChoiceOpen(false);
    if (scope === "all") {
      // Documents that already have page summaries are kept as-is — never a
      // full re-analysis. Only pending/failed docs get analyzed again, then the
      // structure (the cards) is regenerated.
      const toProcess = documents.filter((doc) => getDocumentAnalysisState(doc) !== "complete");
      setDocumentAnalysis(Object.fromEntries(toProcess.map((doc) => [doc.id, "pending" as DocumentAnalysisState])));
      for (const doc of toProcess) await analyzeDocument(doc);
      await doAnalyze();
      return;
    }
    if (retryableDocuments.length === 0) {
      toast("There are no failed or pending documents to retry.", "info");
      return;
    }
    for (const doc of retryableDocuments) await analyzeDocument(doc);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-[940px] mx-auto px-4 sm:px-6 py-5 sm:py-8 w-full">
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
            {caseData.mediation_status && caseData.mediation_status !== "not_determined" && (
              <div className="mt-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
                  <span
                    className={`w-2 h-2 rounded-full flex-none ${
                      caseData.mediation_status === "required"
                        ? "bg-green-dot"
                        : "bg-amber-dot"
                    }`}
                  />
                  <span className="text-[12.5px] font-bold text-sutra-ink leading-none">
                    Mediation{" "}
                    {caseData.mediation_status === "required" ? "Required" : "Not Required"}
                  </span>
                </div>
                {caseData.mediation_reason && (
                  <p className="mt-2 text-[13.5px] text-sutra-ink-2 font-medium leading-snug max-w-[600px]">
                    {caseData.mediation_reason}
                  </p>
                )}
              </div>
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
          <div className={`flex items-center justify-between gap-3 ${documentsOpen ? "mb-3" : "mb-0"}`}>
            <button
              type="button"
              onClick={() => setDocumentsOpen((open) => !open)}
              aria-expanded={documentsOpen}
              className="inline-flex items-center gap-2 text-left bg-transparent border-0 cursor-pointer group"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 text-sutra-ink-3 transition-transform ${documentsOpen ? "rotate-90" : ""}`} aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span className="text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3 group-hover:text-navy">
                Documents{hasDocs ? ` (${documents.length})` : ""}
              </span>
            </button>
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

          {documentsOpen && <>
          {!hasDocs && (
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
                <div className="mt-3 space-y-2" aria-label="Sample court cases">
                  {sampleLoading && <p className="text-[12px] text-sutra-ink-3">Loading sample documents…</p>}
                  {!sampleLoading && selectedSampleCase && <p className="text-[12px] text-green-700">Sample documents are uploading and analysis will start automatically.</p>}
                  {SAMPLE_CASES.map((sample) => (
                    <div
                      key={sample.id}
                      role="radio"
                      aria-checked={selectedSampleCase === sample.id}
                      tabIndex={0}
                      onClick={() => { void selectSampleCase(sample); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void selectSampleCase(sample);
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
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
                        </button>
                        <span className="min-w-0 flex-1 text-[13px] sm:text-[14px] font-semibold text-sutra-ink truncate">{sample.title}</span>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void selectSampleCase(sample); }}
                          aria-label={`Use ${sample.title}`}
                          title={`Use ${sample.title}`}
                          disabled={sampleLoading || uploading}
                          className="w-7 h-7 rounded-full border-2 border-navy text-navy grid place-items-center hover:bg-navy hover:text-white transition-colors cursor-pointer flex-none disabled:opacity-50 disabled:cursor-default"
                        >
                          {selectedSampleCase === sample.id && <span className="w-2 h-2 rounded-full bg-current" />}
                        </button>
                      </div>
                      {expandedSampleCase === sample.id && (
                        <div className="border-t border-sutra-line-2 px-3.5 py-3 text-[12px] text-sutra-ink-3">
                          <p>{sample.summary}</p>
                          <p className="mt-1">{sample.files.length} court documents will be uploaded.</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {sample.files.map((path) => (
                              <a key={path} href={path} download className="text-navy font-semibold hover:underline cursor-pointer">Download {path.split("/").pop()}</a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                    <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-semibold ${
                      getDocumentAnalysisState(d) === "complete"
                        ? "text-green-700"
                        : getDocumentAnalysisState(d) === "analyzing"
                        ? "text-blue-700"
                        : getDocumentAnalysisState(d) === "failed"
                        ? "text-red-700"
                        : "text-sutra-ink-3"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        getDocumentAnalysisState(d) === "complete"
                          ? "bg-green-500"
                          : getDocumentAnalysisState(d) === "analyzing"
                          ? "bg-blue-500 animate-pulse"
                          : getDocumentAnalysisState(d) === "failed"
                          ? "bg-red-500"
                          : "bg-sutra-ink-3"
                      }`} />
                      {getDocumentAnalysisState(d) === "complete"
                        ? "Analyzed"
                        : getDocumentAnalysisState(d) === "analyzing"
                        ? "Analyzing…"
                        : getDocumentAnalysisState(d) === "failed"
                        ? "Analysis failed"
                        : "Pending analysis"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => analyzeDocument(d)}
                    disabled={getDocumentAnalysisState(d) === "analyzing" || isProcessing}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-navy hover:underline bg-transparent border-0 cursor-pointer flex-none disabled:opacity-50 disabled:cursor-default"
                  >
                    {getDocumentAnalysisState(d) === "analyzing" ? <Spinner className="w-3.5 h-3.5" /> : null}
                    {getDocumentAnalysisState(d) === "complete" ? "Re-analyze" : "Analyze"}
                  </button>
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
          </>}
        </div>

        {/* Analysis bar */}
        {/* Analysis bar — always visible so the Run Case Analysis button is
            never hidden; it is disabled with a tooltip until at least one
            document has been analyzed. */}
        {(
          <div className="flex items-center gap-3 flex-wrap bg-white border border-sutra-line rounded-2xl px-4 sm:px-5 py-3.5 mb-5 sm:mb-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-none ${
                    isProcessing
                    ? "bg-blue-500 animate-pulse"
                    : isStructured
                    ? "bg-green-dot"
                    : allDocumentsAnalyzed && caseData.status === "failed"
                    ? "bg-amber-dot"
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
                    : allDocumentsAnalyzed && caseData.status === "failed"
                    ? "Document analysis complete"
                    : caseData.status === "failed"
                    ? "Analysis failed"
                    : "Not analyzed yet"}
                </p>
                <p className="text-[12px] text-sutra-ink-3">
                  {isProcessing
                    ? "You can leave this page — we’ll notify you when the analysis is ready."
                    : isStructured
                    ? "Sections below are populated from your documents"
                    : allDocumentsAnalyzed && caseData.status === "failed"
                    ? "All documents are analyzed. Run case analysis to populate the case sections."
                    : !anyDocumentAnalyzed
                    ? "Analyze at least one document first — the button above unlocks once a summary exists."
                    : "Run analysis to populate the case sections"}
                </p>
              </div>
            </div>
            <span className="flex-1" />
            <span className="relative inline-flex group">
              <button
                onClick={() => setAnalysisChoiceOpen(true)}
                disabled={isProcessing || !anyDocumentAnalyzed}
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
                {isProcessing ? "Analyzing…" : isStructured ? "Regenerate" : "Run Case Analysis"}
              </button>
              {analysisTooltip && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 whitespace-normal text-center max-w-[280px] rounded-lg bg-navy px-3 py-1.5 text-[12px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg"
                >
                  {analysisTooltip}
                </span>
              )}
            </span>
          </div>
        )}

        {hasDocs && (
          <section className="bg-white border border-sutra-line rounded-2xl px-4 sm:px-5 py-4 mb-5 sm:mb-6" aria-labelledby="related-corpus-heading">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-9 h-9 rounded-[10px] bg-emerald-50 text-emerald-700 grid place-items-center flex-none" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 id="related-corpus-heading" className="text-[15px] font-bold text-sutra-ink">Related corpus cases</h2>
                <p className="text-[12.5px] text-sutra-ink-3 mt-0.5">Published judgments ingested and reviewed by the researcher or curator pipeline.</p>
              </div>
            </div>

            {relatedCorpusLoading ? (
              <div className="space-y-2" aria-label="Finding related corpus cases">
                {[1, 2].map((item) => <div key={item} className="h-[62px] rounded-xl bg-slate-50 border border-sutra-line animate-pulse" />)}
              </div>
            ) : (
              visibleRelatedCorpusCases.length > 0 ? (
                <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                  {visibleRelatedCorpusCases.map((reference) => {
                  // Storage URLs are private; prefer the source's official URL
                  // so users never hit a raw Wasabi AccessDenied XML response.
                  const source = reference.source_url;
                  return (
                    <article key={reference.document_id} className="rounded-xl border border-sutra-line-2 bg-slate-50/70 p-3.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[13.5px] font-semibold text-sutra-ink leading-snug line-clamp-2">{reference.title || "Untitled judgment"}</h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 flex-none">
                          Corpus case
                        </span>
                      </div>
                      <p className="text-[11.5px] text-sutra-ink-3 mt-2 line-clamp-1">
                        {[reference.citation, reference.court, reference.year].filter(Boolean).join(" · ") || "Published reference judgment"}
                      </p>
                      {source ? (
                        <a
                          href={source}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => void corpusService.recordSourceClick({ query: caseData.title, document_id: reference.document_id, result_count: visibleRelatedCorpusCases.length })}
                          className="inline-flex items-center gap-1 mt-2.5 text-[12px] font-semibold text-navy hover:underline cursor-pointer"
                        >
                          Open source
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="inline-flex mt-2.5 text-[12px] text-sutra-ink-3">Corpus reference</span>
                      )}
                    </article>
                  );
                  })}
                </div>
              ) : null
            )}
          </section>
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

                  {cards.map((c) => (
                    <div key={c.id} className="relative group/card">
                      <button
                        onClick={() => runCustomCard(c)}
                        className="relative flex flex-col items-center text-center p-3 rounded-xl border-[1.5px] transition-all cursor-pointer gap-1.5 w-full border-sutra-line bg-white hover:border-navy hover:bg-tint"
                        title={`${c.label}${c.subtitle ? ` — ${c.subtitle}` : ""}`}
                      >
                        <span className={`w-9 h-9 rounded-[10px] grid place-items-center flex-none ${c.color ?? "bg-tint text-navy"}`}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-[19px] h-[19px]"
                          >
                            {CARD_ICONS[c.icon ?? "star"] ?? CARD_ICONS.star}
                          </svg>
                        </span>
                        <span className="text-[13px] font-bold text-sutra-ink leading-tight">
                          {c.label}
                        </span>
                        {c.subtitle && (
                          <span className="text-[11px] text-sutra-ink-3 font-medium leading-tight max-[640px]:hidden">
                            {c.subtitle}
                          </span>
                        )}
                      </button>
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingCard(c); setCardModalOpen(true); }}
                          aria-label={`Edit ${c.label}`}
                          className="w-7 h-7 rounded-full bg-white border border-sutra-line text-sutra-ink-2 hover:text-navy hover:border-navy grid place-items-center shadow-sm"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCard(c); }}
                          aria-label={`Delete ${c.label}`}
                          className="w-7 h-7 rounded-full bg-white border border-sutra-line text-sutra-ink-2 hover:text-red-600 hover:border-red-300 grid place-items-center shadow-sm"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => { setEditingCard(null); setCardModalOpen(true); }}
                    className="flex flex-col items-center text-center p-3 rounded-xl border-[1.5px] transition-all cursor-pointer gap-1.5 border-dashed border-sutra-line-2 bg-[#FAFBFD] text-sutra-ink-3 hover:border-navy hover:text-navy hover:bg-tint"
                  >
                    <span className="w-9 h-9 rounded-[10px] grid place-items-center flex-none border border-dashed border-sutra-line-2 text-sutra-ink-3">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px]">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    <span className="text-[13px] font-bold text-sutra-ink-3 leading-tight">
                      My card
                    </span>
                    <span className="text-[11px] font-medium leading-tight max-[640px]:hidden">
                      Make your own
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Tab content */}
            <div
              ref={tabPanelRef}
              className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 min-h-[240px] sm:min-h-[300px] [overflow-wrap:anywhere]"
            >
              {showAnalysisLoading ? (
                <div
                  className="flex flex-col items-center justify-center py-14 sm:py-20 text-center"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Spinner className="w-8 h-8 text-navy" />
                  <p className="mt-3 text-[15px] font-semibold text-sutra-ink">
                    Analyzing case documents…
                  </p>
                  <p className="mt-1 text-[13px] text-sutra-ink-3 max-w-[340px]">
                    {activeTab === "overview"
                      ? "Building the case brief from your documents."
                      : "Extracting this section from your documents."}{" "}
                    You can leave this page — the tabs update automatically.
                  </p>
                </div>
              ) : (
                <>
                  {activeTab === "overview" && <OverviewTab data={caseData} onGenerate={() => void doAnalyze()} />}
                  {activeTab === "parties" && (
                    <PartiesTab
                      data={caseData}
                      highlightIndex={highlight?.tab === "parties" ? highlight.index : null}
                    />
                  )}
                  {activeTab === "witnesses" && (
                    <WitnessesTab
                      data={caseData}
                      highlightIndex={highlight?.tab === "witnesses" ? highlight.index : null}
                    />
                  )}
                  {activeTab === "evidence" && (
                    <EvidenceTab
                      data={caseData}
                      highlightIndex={highlight?.tab === "evidence" ? highlight.index : null}
                    />
                  )}
                  {activeTab === "chronology" && (
                    <ChronologyTab
                      data={caseData}
                      highlightIndex={highlight?.tab === "chronology" ? highlight.index : null}
                    />
                  )}
                  {activeTab === "research" && (
                    <ResearchTab
                      data={caseData}
                      authoritySources={authorityCorpusSources}
                      onOpenSource={openSource}
                      highlightIndex={highlight?.tab === "research" ? highlight.index : null}
                    />
                  )}
                  {activeTab === "pages" && (
                    <PagesTab caseId={caseId} documents={documents} importantPages={caseData.important_pages} />
                  )}
                  {activeTab === "police" && <PoliceTab data={caseData} />}
                  {activeTab === "courts" && (
                    <CourtsTab
                      data={caseData}
                      highlightIndex={highlight?.tab === "courts" ? highlight.index : null}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {analysisChoiceOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="analysis-choice-title">
          <button
            type="button"
            aria-label="Close analysis options"
            onClick={() => setAnalysisChoiceOpen(false)}
            className="absolute inset-0 bg-black/40 cursor-default"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-sutra-line shadow-xl p-5 sm:p-6">
            <h2 id="analysis-choice-title" className="text-[17px] font-bold text-sutra-ink">Run case analysis</h2>
            <p className="text-[13px] text-sutra-ink-3 mt-1.5 mb-4">
              Generates the case sections from the documents you've already analyzed. Documents with summaries are kept as-is — only pending or failed ones are re-analyzed.
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void runSelectedAnalysis("all")}
                className="w-full text-left rounded-xl border border-sutra-line px-4 py-3 hover:border-navy/40 hover:bg-tint/40 transition-colors cursor-pointer"
              >
                <span className="block text-[14px] font-semibold text-sutra-ink">Generate case sections</span>
                <span className="block text-[12px] text-sutra-ink-3 mt-0.5">Build the brief, parties, evidence, chronology, and legal sections from analyzed documents.</span>
              </button>
              <button
                type="button"
                onClick={() => void runSelectedAnalysis("failed")}
                disabled={retryableDocuments.length === 0}
                className="w-full text-left rounded-xl border border-sutra-line px-4 py-3 hover:border-navy/40 hover:bg-tint/40 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                <span className="block text-[14px] font-semibold text-sutra-ink">Analyze failed documents only</span>
                <span className="block text-[12px] text-sutra-ink-3 mt-0.5">
                  {retryableDocuments.length > 0
                    ? `Retry ${retryableDocuments.length} pending or failed document${retryableDocuments.length === 1 ? "" : "s"}.`
                    : "There are no pending or failed documents."}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAnalysisChoiceOpen(false)}
              className="w-full mt-4 rounded-xl border border-sutra-line px-4 py-2.5 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {/* ═══ Inline knowledge-base source viewer ═══ */}
      {sourceViewer && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#F7F8FB]" role="dialog" aria-modal="true" aria-label={sourceViewer.title}>
          {/* Viewer header */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-sutra-line bg-white flex-none">
            <span className="flex-none w-9 h-9 rounded-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 grid place-items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[18px] h-[18px]">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-[15px] font-bold text-sutra-ink truncate">{sourceViewer.title}</h4>
              <p className="text-[12.5px] text-sutra-ink-3">Knowledge base source</p>
            </div>
            <button
              onClick={closeSource}
              className="flex-none w-9 h-9 rounded-lg border border-sutra-line bg-white text-sutra-ink-3 grid place-items-center hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
              aria-label="Close source viewer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Viewer body */}
          <div className="flex-1 min-h-0 relative bg-[#F7F8FB]">
            {(sourceLoading || !sourceViewer.url) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sutra-ink-3">
                <Spinner className="w-8 h-8 text-navy" />
                <p className="text-[14px] font-semibold">Loading source…</p>
              </div>
            )}
            {sourceViewer.url && (
              <iframe
                key={sourceViewer.url}
                src={sourceViewer.url}
                title={sourceViewer.title}
                className="w-full h-full border-0 bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* ═══ Case Assistant FAB — hidden while the panel is open, which carries
          its own close button; showing a second X here made two. ═══ */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          aria-label="Case assistant"
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-navy text-white hover:bg-navy-dark hover:scale-105 shadow-navy/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-[26px] sm:h-[26px]"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg>
        </button>
      )}

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
                : m.failed ? (
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[13px] sm:text-[14px] leading-relaxed bg-red-50 border border-red-200 text-red-800">
                    <p>{m.content}</p>
                    {m.retry && (
                      <button
                        type="button"
                        onClick={() => retryChat(m.retry!)}
                        disabled={chatLoading}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                        Retry
                      </button>
                    )}
                  </div>
                )
                : <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed bg-[#F4F6F8] text-sutra-ink border border-sutra-line-2 rounded-bl-md chat-markdown"><Markdown>{m.content}</Markdown></div>}
              </div>
            ))}
            {chatLoading && <div className="flex justify-start"><div className="bg-[#F4F6F8] border border-sutra-line-2 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 rounded-full bg-sutra-line-2 animate-bounce [animation-delay:300ms]" /></div>{chatSlow && <p className="mt-2 text-[11.5px] text-sutra-ink-3">Still working — a long case can take up to two minutes.</p>}</div></div>}
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

      {/* ═══ Create / edit custom card modal ═══ */}
      {cardModalOpen && (
        <CardModal
          key={editingCard?.id ?? "new-card"}
          open={cardModalOpen}
          editing={editingCard}
          data={caseData}
          documents={documents}
          onClose={() => {
            setCardModalOpen(false);
            setEditingCard(null);
          }}
          onSave={saveCard}
          saving={savingCard}
        />
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

function EmptyState({ title, desc, onAction, actionLabel = "Generate" }: { title: string; desc: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
          <path d="M12 2v20M2 12h20" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[17px] font-semibold text-sutra-ink mb-1">{title}</p>
      <p className="text-[15px] text-sutra-ink-3">{desc}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="mt-5 w-10 h-10 rounded-xl border border-sutra-line bg-white text-navy grid place-items-center mx-auto hover:border-navy hover:bg-tint transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      )}
    </div>
  );
}

function OverviewTab({ data, onGenerate }: { data: JudicialCaseDetail; onGenerate?: () => void }) {
  const brief = data.case_brief as any;
  if (!brief) {
    return (
      <EmptyState
        title="No case brief yet"
        desc="Run Analysis to generate a case brief from your documents."
        onAction={onGenerate}
        actionLabel="Generate case brief"
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

function PartiesTab({ data, highlightIndex }: { data: JudicialCaseDetail; highlightIndex?: number | null }) {
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
              <div key={i} data-item-idx={i} className={`flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0 rounded-lg ${i === highlightIndex ? "flash-item" : ""}`}>
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
              <div key={i} data-item-idx={parties.length + i} className={`flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0 rounded-lg ${parties.length + i === highlightIndex ? "flash-item" : ""}`}>
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

function WitnessesTab({ data, highlightIndex }: { data: JudicialCaseDetail; highlightIndex?: number | null }) {
  const witnesses = (data.witnesses as any[]) || [];
  if (!witnesses.length) {
    return <EmptyState title="No witnesses identified" desc="Run Analysis to extract witness names and statements." />;
  }
  return (
    <div className="space-y-2">
      {witnesses.map((w: any, i: number) => (
        <div key={i} data-item-idx={i} className={`flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0 rounded-lg ${i === highlightIndex ? "flash-item" : ""}`}>
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

function EvidenceTab({ data, highlightIndex }: { data: JudicialCaseDetail; highlightIndex?: number | null }) {
  const evidence = (data.evidence as any[]) || [];
  if (!evidence.length) {
    return <EmptyState title="No evidence mapped" desc="Run Analysis to classify and map evidence from your documents." />;
  }
  return (
    <div className="space-y-2">
      {evidence.map((e: any, i: number) => (
        <div key={i} data-item-idx={i} className={`flex items-start gap-3 py-3 border-b border-sutra-line-2 last:border-0 rounded-lg ${i === highlightIndex ? "flash-item" : ""}`}>
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

function ChronologyTab({ data, highlightIndex }: { data: JudicialCaseDetail; highlightIndex?: number | null }) {
  const chronology = (data.chronology as any[]) || [];
  if (!chronology.length) {
    return <EmptyState title="No chronology yet" desc="Run Analysis to build a timeline from the case events." />;
  }
  return (
    <div className="relative pl-6">
      <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-sutra-line" />
      {chronology.map((c: any, i: number) => (
        <div key={i} data-item-idx={i} className={`relative mb-6 last:mb-0 rounded-lg ${i === highlightIndex ? "flash-item" : ""}`}>
          <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-navy border-2 border-white" />
          <span className="text-[12px] font-bold text-sutra-ink-3 uppercase tracking-wider">{c.date || c.stage || ""}</span>
          <p className="text-[15px] text-sutra-ink mt-1 leading-relaxed">{c.event || c.description || ""}</p>
          {c.page_reference && <span className="text-[12px] text-sutra-ink-3">p. {c.page_reference}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Clickable reference to a published knowledge-base source. Opens the exact
 * page of the source PDF in the in-app viewer via `onOpen`. Reusable across
 * cards (provisions today; police sections / court history later).
 */
function CorpusRefLink({
  documentId,
  page,
  label,
  onOpen,
}: {
  documentId: number;
  page?: number | null;
  label?: string;
  onOpen: (documentId: number, page?: number | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(documentId, page ?? undefined)}
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-navy hover:underline"
    >
      <span className="truncate max-w-[22rem]">{label ?? "View source"}</span>
      {page ? <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1 py-px flex-none">p. {page}</span> : null}
      <span aria-hidden className="flex-none">↗</span>
    </button>
  );
}

function ResearchTab({ data, authoritySources, onOpenSource, highlightIndex }: { data: JudicialCaseDetail; authoritySources?: CorpusSearchHit[]; onOpenSource: (documentId: number, page?: number | null) => void; highlightIndex?: number | null }) {
  const provisions = (data.legal_provisions as any[]) || [];
  if (!provisions.length) {
    return <EmptyState title="No legal research yet" desc="Run Analysis to identify relevant acts, sections, and precedents." />;
  }
  return (
    <div className="space-y-5">
      {authoritySources && authoritySources.length > 0 && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
          <h3 className="text-[12px] font-bold uppercase tracking-widest text-emerald-800">Knowledge base references</h3>
          <p className="text-[12px] text-sutra-ink-3 mt-1">Authoritative sources retrieved from the published legal knowledge base.</p>
          <div className="mt-2.5 space-y-2">
            {authoritySources.map((source) => (
              <div key={source.document_id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
                {/* Whole card opens the source in-app at the retrieved page. */}
                <button type="button" onClick={() => onOpenSource(source.document_id, source.page_start ?? undefined)} className="min-w-0 text-left group flex-1">
                  <p className="text-[13px] font-semibold text-sutra-ink truncate group-hover:underline">{source.title}</p>
                  <p className="text-[11.5px] text-sutra-ink-3">{source.citation}{source.year ? ` · ${source.year}` : ""}{source.page_start ? ` · p. ${source.page_start}` : ""}</p>
                </button>
                {source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-navy hover:underline flex-none">Open source ↗</a>}
              </div>
            ))}
          </div>
        </section>
      )}
      {provisions.map((p: any, i: number) => (
        <div key={i} data-item-idx={i} className={`py-3 border-b border-sutra-line-2 last:border-0 rounded-lg ${i === highlightIndex ? "flash-item" : ""}`}>
          <b className="text-[15px] text-navy">{p.act || p.title || ""}</b>
          {p.section && <span className="text-[14px] text-sutra-ink-2 ml-2">§ {p.section}</span>}
          {p.description && <p className="text-[14px] text-sutra-ink-2 mt-1">{p.description}</p>}
          {p.source?.document_id && (
            <div className="mt-1.5">
              <CorpusRefLink
                documentId={p.source.document_id}
                page={p.source.page}
                label={p.source.citation || p.source.title || "View source"}
                onOpen={onOpenSource}
              />
            </div>
          )}
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
  importantPages,
}: {
  caseId: number;
  documents: JudicialDocument[];
  importantPages?: JudicialCaseDetail["important_pages"];
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
      {/* Important pages — the folios that matter most */}
      {importantPages && importantPages.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
            Important pages
          </h3>
          <div className="space-y-2">
            {importantPages.map((p, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2 last:border-0">
                <span className="flex-none min-w-[44px] h-7 bg-amber-bg text-amber-ink border border-amber-200 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
                  p. {p.page}
                </span>
                <div>
                  <b className="text-[14.5px]">{p.title || "Page " + p.page}</b>
                  {p.reason && (
                    <p className="text-[14px] text-sutra-ink-2 mt-0.5">{p.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

function PoliceTab({ data }: { data: JudicialCaseDetail }) {
  const police = data.police_station;
  if (
    !police ||
    (!police.station && !police.investigating_officer && !police.fir_number)
  ) {
    return (
      <EmptyState
        title="No police / IO details"
        desc="Run Analysis to extract the police station, FIR details and investigating officer from your documents."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
          Police station
        </h3>
        <div className="mb-4">
          <b className="text-[15px]">{police.station || "Not recorded"}</b>
        </div>
        <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
          FIR details
        </h3>
        <div className="space-y-2.5">
          {[
            ["FIR No.", police.fir_number],
            ["Date", police.fir_date],
            ["Sections", police.sections],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2 last:border-0">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">{label}</span>
              <b className="text-[14px]">{value || "—"}</b>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
          Investigating Officer
        </h3>
        <div className="mb-4">
          <span className="block text-[11.5px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-0.5">
            IO
          </span>
          <b className="text-[15px]">{police.investigating_officer || "Not recorded"}</b>
          {police.io_badge && (
            <span className="text-[13.5px] text-sutra-ink-3 block">
              {police.io_badge}
            </span>
          )}
        </div>
        <div className="space-y-2.5">
          {[
            ["Contact", police.io_contact],
            ["Status", police.charge_sheet_status],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2 last:border-0">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">{label}</span>
              <b className="text-[14px]">{value || "—"}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CourtsTab({ data, highlightIndex }: { data: JudicialCaseDetail; highlightIndex?: number | null }) {
  const courts = (data.court_history as any[]) || [];
  if (!courts.length) {
    return (
      <EmptyState
        title="No court history yet"
        desc="Run Analysis to trace which courts this case has passed through."
      />
    );
  }
  return (
    <div className="space-y-2">
      {courts.map((c: any, i: number) => (
        <div
          key={i}
          data-item-idx={i}
          className={`flex items-start gap-3 py-3.5 border-b border-sutra-line-2 last:border-0 rounded-lg ${i === highlightIndex ? "flash-item" : ""}`}
        >
          <span className="flex-none w-8 h-8 rounded-full bg-tint text-navy grid place-items-center font-bold text-[14px] border border-tint-2">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <b className="text-[15px]">{c.court || `Court ${i + 1}`}</b>
              {c.stage && (
                <span className="text-[12.5px] font-semibold text-sutra-ink-2">{c.stage}</span>
              )}
              {c.date && <span className="text-[12.5px] text-sutra-ink-3">{c.date}</span>}
            </div>
            {c.action && <p className="text-[14px] text-sutra-ink-2 mt-1">{c.action}</p>}
            {(c.case_number || c.outcome) && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {c.case_number && (
                  <span className="text-[11.5px] font-semibold text-sutra-ink-3 bg-[#F4F6F8] border border-sutra-line-2 rounded-full px-2 py-0.5">
                    {c.case_number}
                  </span>
                )}
                {c.outcome && (
                  <span className="text-[11.5px] font-semibold rounded-full px-2 py-0.5 border bg-tint text-navy border-[#CFE0F0]">
                    {c.outcome}
                  </span>
                )}
              </div>
            )}
            {c.page_reference && <span className="text-[12px] text-sutra-ink-3">p. {c.page_reference}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Create / edit custom card modal ─── */

interface CardModalProps {
  open: boolean;
  editing: JudicialCaseCard | null;
  data: JudicialCaseDetail;
  documents: JudicialDocument[];
  onClose: () => void;
  onSave: (input: {
    label: string;
    subtitle?: string;
    action_type: JudicialCaseCard["action_type"];
    action_value: JudicialCaseCard["action_value"];
    icon: string;
    color: string;
  }) => void;
  saving: boolean;
}

const ACTION_TYPES: { value: JudicialCaseCard["action_type"]; label: string; desc: string }[] = [
  { value: "chat", label: "Saved AI query", desc: "Runs a question in the Case Assistant" },
  { value: "tab", label: "Jump to section", desc: "Opens a case section tab" },
  { value: "folio", label: "Open a folio", desc: "Opens a document at a page" },
  { value: "item", label: "Deep-link to an item", desc: "Jumps to a party / witness / evidence" },
];

/* Tabs that expose selectable items for the "item" action. */
const ITEM_TABS: Tab[] = ["parties", "witnesses", "evidence", "chronology", "research", "courts"];

function CardModal({ open, editing, data, documents, onClose, onSave, saving }: CardModalProps) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [subtitle, setSubtitle] = useState(editing?.subtitle ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "star");
  const [color, setColor] = useState(editing?.color ?? "bg-tint text-navy");
  const [actionType, setActionType] = useState<JudicialCaseCard["action_type"]>(
    editing?.action_type ?? "chat"
  );
  const [query, setQuery] = useState(editing?.action_value?.query ?? "");
  const [tab, setTab] = useState<Tab>(
    (editing?.action_value?.tab as Tab) ?? "overview"
  );
  const [docId, setDocId] = useState(editing?.action_value?.docId ?? "");
  const [page, setPage] = useState(editing?.action_value?.page ?? 1);
  const [itemTab, setItemTab] = useState<Tab>(
    (editing?.action_type === "item" ? (editing?.action_value?.tab as Tab) : null) ?? "parties"
  );
  const [itemIndex, setItemIndex] = useState(editing?.action_value?.index ?? 0);

  if (!open) return null;

  const itemOptions = (() => {
    const list: unknown[] =
      itemTab === "parties"
        ? [...(data.parties as unknown[] | undefined) ?? [], ...(data.accused as unknown[] | undefined) ?? []]
        : itemTab === "witnesses"
        ? (data.witnesses as unknown[] | undefined) ?? []
        : itemTab === "evidence"
        ? (data.evidence as unknown[] | undefined) ?? []
        : itemTab === "chronology"
        ? (data.chronology as unknown[] | undefined) ?? []
        : (data.legal_provisions as unknown[] | undefined) ?? [];
    return list.map((_, i) => ({ index: i, label: itemLabel(data, itemTab, i) }));
  })();

  const selectedDoc = documents.find((d) => d.id === docId);
  const pageMax = selectedDoc?.page_count || 1;

  const valid =
    label.trim().length > 0 &&
    (actionType !== "chat" || query.trim().length > 0) &&
    (actionType !== "folio" || docId !== "") &&
    (actionType !== "item" || itemOptions.length > 0);

  const submit = () => {
    if (!valid || saving) return;
    let actionValue: JudicialCaseCard["action_value"];
    switch (actionType) {
      case "chat":
        actionValue = { query: query.trim() };
        break;
      case "tab":
        actionValue = { tab };
        break;
      case "folio":
        actionValue = { docId, page };
        break;
      case "item":
        actionValue = { tab: itemTab, index: itemIndex };
        break;
    }
    onSave({
      label: label.trim(),
      subtitle: subtitle.trim() || undefined,
      action_type: actionType,
      action_value: actionValue,
      icon,
      color,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-sutra-line w-full max-w-lg animate-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-sutra-line flex-none">
          <div>
            <h3 className="text-[17px] font-bold text-sutra-ink">
              {editing ? "Edit card" : "Make your own card"}
            </h3>
            <p className="text-[12.5px] text-sutra-ink-3">
              A shortcut for anything you do with this case.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg grid place-items-center hover:bg-tint transition-colors text-sutra-ink-3"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
              Name
            </label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Bail conditions"
              maxLength={120}
              className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3.5 font-[inherit] text-[14px] text-sutra-ink outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder:text-sutra-ink-3"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
              Subtitle <span className="normal-case font-medium text-sutra-ink-3/70">(optional)</span>
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Key arrest terms"
              maxLength={255}
              className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3.5 font-[inherit] text-[14px] text-sutra-ink outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder:text-sutra-ink-3"
            />
          </div>

          {/* Action type */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
              What it does
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTION_TYPES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActionType(a.value)}
                  className={`text-left p-3 rounded-xl border-[1.5px] transition-all cursor-pointer ${
                    actionType === a.value
                      ? "border-navy bg-tint"
                      : "border-sutra-line bg-white hover:border-navy hover:bg-tint"
                  }`}
                >
                  <span className="block text-[13.5px] font-bold text-sutra-ink leading-tight">
                    {a.label}
                  </span>
                  <span className="block text-[11.5px] text-sutra-ink-3 font-medium leading-snug mt-0.5">
                    {a.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action-specific fields */}
          {actionType === "chat" && (
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                Question to ask
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                placeholder="e.g. Summarise the bail conditions mentioned in the charge sheet"
                className="w-full border border-sutra-line rounded-xl px-3.5 py-3 font-[inherit] text-[14px] text-sutra-ink outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder:text-sutra-ink-3 resize-y"
              />
            </div>
          )}

          {actionType === "tab" && (
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                Section
              </label>
              <select
                value={tab}
                onChange={(e) => setTab(e.target.value as Tab)}
                className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3 font-[inherit] text-[14px] text-sutra-ink outline-none focus:border-navy transition-colors bg-white"
              >
                {TAB_OPTIONS.map((t) => (
                  <option key={t.tab} value={t.tab}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {actionType === "folio" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                  Document
                </label>
                <select
                  value={docId}
                  onChange={(e) => { setDocId(e.target.value); setPage(1); }}
                  className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3 font-[inherit] text-[14px] text-sutra-ink outline-none focus:border-navy transition-colors bg-white"
                >
                  <option value="">Select a document…</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_filename}
                      {d.page_count ? ` (${d.page_count}p)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {docId && (
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                    Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={pageMax}
                    value={page}
                    onChange={(e) => setPage(Math.max(1, Math.min(pageMax, Number(e.target.value) || 1)))}
                    className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3.5 font-[inherit] text-[14px] text-sutra-ink outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/10"
                  />
                </div>
              )}
            </div>
          )}

          {actionType === "item" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                  Section
                </label>
                <select
                  value={itemTab}
                  onChange={(e) => { setItemTab(e.target.value as Tab); setItemIndex(0); }}
                  className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3 font-[inherit] text-[14px] text-sutra-ink outline-none focus:border-navy transition-colors bg-white"
                >
                  {TAB_OPTIONS.filter((t) => ITEM_TABS.includes(t.tab)).map((t) => (
                    <option key={t.tab} value={t.tab}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                  Item
                </label>
                <select
                  value={itemIndex}
                  onChange={(e) => setItemIndex(Number(e.target.value))}
                  disabled={itemOptions.length === 0}
                  className="w-full min-h-[42px] border border-sutra-line rounded-xl px-3 font-[inherit] text-[14px] text-sutra-ink outline-none focus:border-navy transition-colors bg-white disabled:opacity-50"
                >
                  {itemOptions.length === 0 ? (
                    <option value={0}>No items in this section yet</option>
                  ) : (
                    itemOptions.map((o) => (
                      <option key={o.index} value={o.index}>{o.label}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Icon */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CARD_ICONS).map((name) => (
                <button
                  key={name}
                  onClick={() => setIcon(name)}
                  aria-label={`Icon ${name}`}
                  className={`w-10 h-10 rounded-[10px] grid place-items-center transition-all cursor-pointer ${
                    icon === name
                      ? "bg-tint text-navy border-[1.5px] border-navy"
                      : "bg-[#F4F6F8] text-sutra-ink-3 border-[1.5px] border-transparent hover:border-sutra-line-2"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                    {CARD_ICONS[name]}
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
              Colour
            </label>
            <div className="flex flex-wrap gap-2">
              {CARD_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  aria-label={`Colour ${c.label}`}
                  className={`w-10 h-10 rounded-[10px] grid place-items-center transition-all cursor-pointer ${c.swatch} ${
                    color === c.value ? "ring-2 ring-navy ring-offset-2" : "ring-1 ring-sutra-line"
                  }`}
                >
                  {color === c.value && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-sutra-line flex-none">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-sutra-ink border border-sutra-line hover:bg-tint transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-navy transition-colors hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Spinner className="w-3.5 h-3.5" />}
            {editing ? "Save changes" : "Create card"}
          </button>
        </div>
      </div>
    </div>
  );
}
