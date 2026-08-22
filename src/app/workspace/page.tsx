"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import TopBar from "@/components/TopBar";

/* ─── Types ─── */
type MsgKind = "text" | "analysis" | "pages" | "verdict";

interface PageNote {
  page: number;
  text: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  kind: MsgKind;
  content: string;
  /** analysis card body selector */
  action?: string;
  /** page-by-page stream */
  pages?: PageNote[];
  pageTotal?: number;
  streaming?: boolean;
  timestamp: Date;
}

type ActionType = "summary" | "important" | "witness" | "police" | null;

const ACTION_TITLES: Record<string, string> = {
  summary: "Case Summary",
  important: "Important Pages",
  witness: "Witnesses & Key Persons",
  police: "Police Station / IO Details",
};

/**
 * Per-page analysis seam.
 * TODO: replace the stub with the backend call once the per-page endpoint exists
 * (nothing under /api/v1/ai serves this yet — only /suggest-type).
 */
async function summarisePage(pageNo: number): Promise<PageNote> {
  await new Promise((r) => setTimeout(r, 160));
  return {
    page: pageNo,
    text: `Placeholder summary for page ${pageNo} — the real per-page analysis lands here once the backend endpoint is wired.`,
  };
}


/* ─── Page ─── */
export default function WorkspacePage() {
  /* PDF state */
  const [pdfName, setPdfName] = useState<string>("No document loaded");
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      kind: "text",
      content:
        "Welcome to the Case Workspace. Upload a PDF to begin, or use the quick analysis buttons above to extract key information from your case file.\n\nYou can also type a question below or use the voice input to speak your query.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);

  /* Results state */
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [panelOpen, setPanelOpen] = useState(true);


  /* Voice */
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  /* Follow the stream only while the reader is already near the bottom,
     so scrolling back through a 100-page run is not yanked away. */
  useEffect(() => {
    const box = messagesBoxRef.current;
    if (!box) return;
    const nearBottom =
      box.scrollHeight - box.scrollTop - box.clientHeight < 160;
    if (nearBottom) box.scrollTop = box.scrollHeight;
  }, [messages]);

  const pushMessage = useCallback((m: Omit<Message, "timestamp">) => {
    setMessages((prev) => [...prev, { ...m, timestamp: new Date() }]);
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const appendPage = useCallback((id: string, note: PageNote) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, pages: [...(m.pages ?? []), note] } : m
      )
    );
  }, []);

  /* ─── PDF.js lazy load ─── */
  const loadPdfJs = useCallback(() => {
    return new Promise<void>((resolve) => {
      if ((window as any).pdfjsLib) return resolve();
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => {
        const lib = (window as any)["pdfjs-dist/build/pdf"];
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        (window as any).pdfjsLib = lib;
        resolve();
      };
      document.head.appendChild(s);
    });
  }, []);

  const openPdf = useCallback(
    async (file: File) => {
      await loadPdfJs();
      const lib = (window as any).pdfjsLib;
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await lib.getDocument({ data }).promise;
      pdfDocRef.current = pdf;
      setPdfName(file.name);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setPdfLoaded(true);
      renderPage(pdf, 1);
    },
    [loadPdfJs]
  );

  const renderPage = useCallback(
    async (pdf: any, num: number) => {
      const page = await pdf.getPage(num);
      const scale = (zoom / 100) * 1.5;
      const vp = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page
        .render({ canvasContext: canvas.getContext("2d"), viewport: vp })
        .promise;
    },
    [zoom]
  );

  /* ─── File handling ─── */
  const handleFile = useCallback(
    (file: File) => {
      if (file.type === "application/pdf") openPdf(file);
    },
    [openPdf]
  );

  /* ─── Chat ─── */
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      kind: "text",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "";
    setSending(true);

    // Simulate AI response (will be wired to backend)
    await new Promise((r) => setTimeout(r, 800));

    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "text",
      content: `Analyzing your query: "${text}"\n\nBased on the uploaded case file, here is what I found. (This is a placeholder — the AI backend will populate real analysis once the API is wired.)`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setSending(false);
  }, [input, sending]);

  /* ─── Quick actions — results stream into the chat ─── */
  const runAction = useCallback(
    async (action: string) => {
      if (sending) return;
      setActiveAction(action as ActionType);
      /* Fold the tile strip away so results own the full column height */
      setPanelOpen(false);
      cancelRef.current = false;
      setSending(true);

      pushMessage({
        id: crypto.randomUUID(),
        role: "user",
        kind: "text",
        content: ACTION_TITLES[action] ?? "Analysis",
      });

      /* Overview card — same content as before, now a chat message */
      pushMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "analysis",
        action,
        content: ACTION_TITLES[action] ?? "Analysis",
      });

      /* Case Summary also walks the document page by page, however long it is */
      if (action === "summary" && pdfLoaded && totalPages > 0) {
        const streamId = crypto.randomUUID();
        pushMessage({
          id: streamId,
          role: "assistant",
          kind: "pages",
          content: "Page-by-page summary",
          pages: [],
          pageTotal: totalPages,
          streaming: true,
        });

        for (let p = 1; p <= totalPages; p++) {
          if (cancelRef.current) break;
          const note = await summarisePage(p);
          appendPage(streamId, note);
        }
        patchMessage(streamId, { streaming: false });
      }

      if (action === "summary" && !cancelRef.current) {
        pushMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "verdict",
          content:
            "This dispute appears suitable for mediation — it is a monetary claim arising from a contractual relationship. Both parties may benefit from structured negotiation.",
        });
      }

      setSending(false);
    },
    [sending, pdfLoaded, totalPages, pushMessage, patchMessage, appendPage]
  );

  const stopStream = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /* ─── Voice input ─── */
  const toggleVoice = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "text",
          content:
            "Voice input is not supported in this browser. Try Chrome or Edge.",
          timestamp: new Date(),
        },
      ]);
      return;
    }
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-IN";
    recog.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setRecording(false);
    };
    recog.onend = () => setRecording(false);
    recognitionRef.current = recog;
    recog.start();
    setRecording(true);
  }, [recording]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />

      <div className="grid grid-cols-2 flex-1 overflow-hidden max-lg:grid-cols-1 max-lg:grid-rows-[45vh_1fr]">
        {/* ─── LEFT: PDF Viewer ─── */}
        <section className="flex flex-col border-r border-sutra-line bg-[#F7F8FB] max-lg:border-r-0 max-lg:border-b">
          {/* PDF toolbar */}
          <div className="flex items-center justify-between gap-2.5 px-[18px] py-2.5 border-b border-sutra-line bg-white flex-none min-h-[54px]">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="w-5 h-5 text-sutra-ink-3 flex-none"
              >
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              <span className="text-[15px] font-semibold text-sutra-ink truncate">
                {pdfName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-none">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors disabled:opacity-35 disabled:pointer-events-none"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-[18px] h-[18px]"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-[14px] font-semibold text-sutra-ink-2 min-w-[64px] text-center">
                {currentPage} / {totalPages || "—"}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages || !pdfLoaded}
                className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors disabled:opacity-35 disabled:pointer-events-none"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-[18px] h-[18px]"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 flex-none max-[640px]:hidden">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-[18px] h-[18px]"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span className="text-[13px] font-semibold text-sutra-ink-3 min-w-[42px] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(400, z + 25))}
                className="w-[34px] h-[34px] border border-sutra-line rounded-lg bg-white text-sutra-ink-2 grid place-items-center hover:bg-[#F2F5F9] hover:border-[#C6CDD7] transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-[18px] h-[18px]"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Canvas / Upload zone — m-auto centres without making overflow
              unreachable, which `items-center` does once zoomed in */}
          <div className="flex-1 overflow-auto relative flex p-4 max-lg:p-2">
            {!pdfLoaded ? (
              <div
                className="m-auto flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-sutra-line rounded-2xl bg-white cursor-pointer transition-colors hover:border-navy hover:bg-tint"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
              >
                <div className="w-16 h-16 rounded-2xl bg-tint text-navy grid place-items-center mb-4 border border-tint-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-sutra-ink">
                  Upload case documents
                </h3>
                <p className="text-[16px] text-sutra-ink-2 mt-1.5">
                  Drag &amp; drop a PDF here, or click to browse
                </p>
                <span className="text-[13.5px] text-sutra-ink-3 mt-1">
                  Supports PDF files up to 50 MB
                </span>
                <button className="mt-5 inline-flex items-center justify-center gap-2.5 bg-navy text-white border-0 rounded-xl text-[17px] font-semibold px-6 py-3.5 min-h-[52px] transition-colors hover:bg-navy-dark">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="w-[22px] h-[22px]"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Browse files
                </button>
              </div>
            ) : (
              <canvas ref={canvasRef} className="m-auto block h-auto max-w-none" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        </section>

        {/* ─── RIGHT: Chat + Actions ─── */}
        <section className="flex flex-col h-full overflow-hidden bg-white">
          {/* Quick actions */}
          <div
            className={`px-5 flex-none border-b border-sutra-line-2 ${
              panelOpen ? "pt-3 pb-3" : "py-2"
            }`}
          >
            <button
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              className="w-full flex items-center gap-2.5 bg-transparent border-0 text-left cursor-pointer group"
            >
              <span className="text-[12px] font-bold uppercase tracking-widest text-sutra-ink-3">
                Quick analysis
              </span>
              {!panelOpen && activeAction && (
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-tint text-navy border border-tint-2">
                  {ACTION_TITLES[activeAction] ?? "Analysis"}
                </span>
              )}
              <span className="flex-1" />
              <span className="text-[12.5px] font-semibold text-sutra-ink-3 group-hover:text-navy transition-colors">
                {panelOpen ? "Hide" : "Show"}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-[17px] h-[17px] text-sutra-ink-3 transition-transform group-hover:text-navy ${
                  panelOpen ? "" : "-rotate-90"
                }`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {panelOpen && (
            <div className="grid grid-cols-5 gap-2 mt-2.5 max-[1024px]:grid-cols-3 max-[640px]:grid-cols-2">
              {(
                [
                  {
                    action: "summary",
                    label: "Case Summary",
                    sub: "Full overview",
                    bg: "bg-tint text-navy",
                    icon: (
                      <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />
                    ),
                  },
                  {
                    action: "important",
                    label: "Important Pages",
                    sub: "Key evidence",
                    bg: "bg-amber-bg text-amber-ink",
                    icon: (
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    ),
                  },
                  {
                    action: "witness",
                    label: "Witnesses",
                    sub: "Names & roles",
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
                    action: "police",
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
                    action: "custom",
                    label: "Ask anything",
                    sub: "Custom query",
                    bg: "bg-green-bg text-green-ink",
                    icon: (
                      <>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </>
                    ),
                  },
                ] as const
              ).map((a) => (
                <button
                  key={a.action}
                  disabled={sending && a.action !== "custom"}
                  onClick={() => {
                    if (a.action === "custom") {
                      document.getElementById("chatInput")?.focus();
                      return;
                    }
                    runAction(a.action);
                  }}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border-[1.5px] transition-all cursor-pointer gap-1.5 disabled:opacity-45 disabled:pointer-events-none ${
                    activeAction === a.action
                      ? "border-navy bg-tint"
                      : "border-sutra-line bg-white hover:border-navy hover:bg-tint"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-[10px] grid place-items-center flex-none ${a.bg}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[19px] h-[19px]"
                    >
                      {a.icon}
                    </svg>
                  </span>
                  <span className="text-[13px] font-bold text-sutra-ink leading-tight">
                    {a.label}
                  </span>
                  <span className="text-[11px] text-sutra-ink-3 font-medium max-[640px]:hidden">
                    {a.sub}
                  </span>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Messages — quick-analysis results stream in here, unbounded */}
          <div
            ref={messagesBoxRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 pb-2.5 flex flex-col gap-4"
          >
            {messages.map((m) =>
              m.kind === "analysis" ? (
                <AnalysisCard key={m.id} title={m.content} action={m.action!} />
              ) : m.kind === "pages" ? (
                <PageStreamCard
                  key={m.id}
                  title={m.content}
                  pages={m.pages ?? []}
                  total={m.pageTotal ?? 0}
                  streaming={!!m.streaming}
                  onStop={stopStream}
                />
              ) : m.kind === "verdict" ? (
                <VerdictCard key={m.id} text={m.content} />
              ) : (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[92%] ${
                    m.role === "user" ? "self-end flex-row-reverse" : ""
                  }`}
                >
                  {m.role === "system" || m.role === "assistant" ? (
                    <SutraAvatar />
                  ) : (
                    <div className="w-9 h-9 flex-none rounded-full bg-navy text-white grid place-items-center font-bold text-[14px]">
                      D
                    </div>
                  )}
                  <div
                    className={`rounded-[14px] px-[18px] py-3.5 text-[16px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-navy text-white rounded-[14px_14px_4px_14px]"
                        : "bg-tint text-sutra-ink border border-sutra-line-2 rounded-[14px_14px_14px_4px]"
                    }`}
                  >
                    {m.content.split("\n").map((p, i) =>
                      p ? (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>
                          {p}
                        </p>
                      ) : (
                        <br key={i} />
                      )
                    )}
                  </div>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="flex-none px-[18px] pt-2.5 pb-2.5 border-t border-sutra-line bg-white">
            <div className="flex items-end gap-2 bg-[#F7F8FB] border-[1.5px] border-sutra-line rounded-[14px] px-2.5 py-1.5 transition-colors focus-within:border-focus">
              <button
                onClick={toggleVoice}
                className={`w-[38px] h-[38px] flex-none border-0 rounded-[10px] grid place-items-center transition-colors ${
                  recording
                    ? "bg-red-50 text-red-600 animate-pulse"
                    : "bg-transparent text-sutra-ink-3 hover:bg-sutra-line-2 hover:text-sutra-ink"
                }`}
                aria-label="Voice input"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[21px] h-[21px]"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v3" />
                </svg>
              </button>
              <textarea
                id="chatInput"
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  /* grow with the text, up to 40% of the viewport, then scroll */
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, window.innerHeight * 0.4) +
                    "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask about this case…"
                className="flex-1 block border-0 bg-transparent outline-none font-[inherit] text-[16px] leading-relaxed text-sutra-ink resize-none min-h-[40px] max-h-[40vh] py-2 placeholder:text-sutra-ink-3"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-10 h-10 flex-none border-0 rounded-[10px] bg-navy text-white grid place-items-center transition-colors hover:bg-navy-dark disabled:bg-sutra-line disabled:text-sutra-ink-3 disabled:pointer-events-none"
                aria-label="Send message"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="m22 2-11 11" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-[12px] text-sutra-ink-3 max-[640px]:hidden">
              {recording
                ? "Listening…"
                : "Enter to send · Shift + Enter for a new line"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Chat card components ─── */

function SutraAvatar() {
  return (
    <div className="w-9 h-9 flex-none rounded-full bg-tint text-navy grid place-items-center border border-tint-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="w-5 h-5"
      >
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      </svg>
    </div>
  );
}

function AnalysisCard({ title, action }: { title: string; action: string }) {
  return (
    <div className="w-full border border-sutra-line rounded-[14px] bg-[#FAFBFD]">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sutra-line-2 bg-white rounded-t-[14px] sticky top-0 z-10">
        <SutraAvatar />
        <h3 className="text-[16px] font-bold text-sutra-ink">{title}</h3>
      </div>
      <div className="px-4 py-4">
        <ResultsContent action={action} />
      </div>
    </div>
  );
}

function PageStreamCard({
  title,
  pages,
  total,
  streaming,
  onStop,
}: {
  title: string;
  pages: PageNote[];
  total: number;
  streaming: boolean;
  onStop: () => void;
}) {
  return (
    <div className="w-full border border-sutra-line rounded-[14px] bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-sutra-line-2 sticky top-0 bg-white rounded-t-[14px] z-10">
        <h3 className="text-[16px] font-bold text-sutra-ink">{title}</h3>
        <span className="text-[13px] font-semibold text-sutra-ink-3">
          {streaming
            ? `Reading page ${Math.min(pages.length + 1, total)} of ${total}…`
            : `${pages.length} of ${total} pages`}
        </span>
        <span className="flex-1" />
        {streaming && (
          <button
            onClick={onStop}
            className="flex-none text-[13px] font-bold px-3 py-1.5 rounded-lg border border-sutra-line bg-white text-sutra-ink-2 hover:border-navy hover:text-navy transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {streaming && total > 0 && (
        <div className="h-[3px] bg-sutra-line-2">
          <div
            className="h-full bg-navy transition-[width] duration-200"
            style={{ width: `${(pages.length / total) * 100}%` }}
          />
        </div>
      )}

      <div className="divide-y divide-sutra-line-2">
        {pages.map((p) => (
          <div key={p.page} className="flex items-start gap-3 px-4 py-3">
            <span className="flex-none min-w-[52px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
              p. {p.page}
            </span>
            <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
              {p.text}
            </p>
          </div>
        ))}
        {pages.length === 0 && (
          <p className="px-4 py-4 text-[15px] text-sutra-ink-3">
            Starting document walk…
          </p>
        )}
      </div>

      {!streaming && pages.length < total && (
        <p className="px-4 py-2.5 text-[13px] text-sutra-ink-3 border-t border-sutra-line-2">
          Stopped at page {pages.length} of {total}.
        </p>
      )}
    </div>
  );
}

function VerdictCard({ text }: { text: string }) {
  return (
    <div className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] border border-tint-2 bg-tint">
      <div className="w-[38px] h-[38px] flex-none rounded-[10px] bg-navy text-white grid place-items-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="w-5 h-5"
        >
          <path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8" />
          <path d="m16 16 6-6" />
          <path d="m8 8 6-6" />
          <path d="m9 7 8 8" />
          <path d="m21 11-8-8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <b className="text-[14px] font-bold text-navy block mb-0.5">
          Mediation Eligibility
        </b>
        <span className="text-[14px] text-sutra-ink-2 leading-snug">{text}</span>
      </div>
      <span className="flex-none text-[13px] font-bold px-3 py-1.5 rounded-full bg-green-bg text-green-ink whitespace-nowrap">
        Likely eligible
      </span>
    </div>
  );
}

/* ─── Results content components ─── */

function ResultsContent({ action }: { action: string }) {
  switch (action) {
    case "summary":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Parties
            </h4>
            <div className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2">
              <span className="flex-none w-8 h-8 rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[14px] border border-[#CFE0F0]">
                A
              </span>
              <div>
                <b>Party A</b>
                <br />
                <span className="text-[14px] text-sutra-ink-3">
                  Applicant / Complainant
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2">
              <span className="flex-none w-8 h-8 rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[14px] border border-[#CFE0F0]">
                B
              </span>
              <div>
                <b>Party B</b>
                <br />
                <span className="text-[14px] text-sutra-ink-3">
                  Respondent / Accused
                </span>
              </div>
            </div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3 mt-5">
              Case type
            </h4>
            <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
              Civil dispute — contract breach with monetary claim. Primary
              relief sought: damages and specific performance.
            </p>
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Key facts
            </h4>
            <ol className="text-[15px] text-sutra-ink-2 leading-relaxed pl-5 space-y-1.5 list-decimal">
              <li>Agreement executed on the date stated in the primary document.</li>
              <li>
                Performance obligations alleged to have been breached.
              </li>
              <li>
                Monetary claim quantified in the plaint / written statement.
              </li>
              <li>
                Notice served prior to institution of proceedings.
              </li>
            </ol>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3 mt-5">
              Relief sought
            </h4>
            <p className="text-[15px] text-sutra-ink-2 leading-relaxed">
              Damages of ₹48,00,000 (rupees forty-eight lakhs) together with
              interest and costs. Alternative prayer for specific performance of
              the agreement.
            </p>
          </div>
        </div>
      );

    case "important":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Critical pages
            </h4>
            {[
              {
                pg: "p. 1–3",
                title: "Agreement / Contract",
                desc: "Executed terms, parties, consideration, obligations.",
              },
              {
                pg: "p. 7",
                title: "Invoice / Payment schedule",
                desc: "Outstanding amount, due dates, penalty clause.",
              },
              {
                pg: "p. 12",
                title: "Breach notice",
                desc: "Formal demand letter, cure period, response deadline.",
              },
            ].map((p) => (
              <div
                key={p.pg}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <span className="flex-none min-w-[44px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
                  {p.pg}
                </span>
                <div>
                  <b>{p.title}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Evidence highlights
            </h4>
            {[
              {
                pg: "p. 15",
                title: "Correspondence",
                desc: "Email chain showing negotiation attempts before suit.",
              },
              {
                pg: "p. 18",
                title: "Expert report",
                desc: "Independent assessment of damages / defects.",
              },
              {
                pg: "p. 22",
                title: "Bank statements",
                desc: "Payment history and outstanding balance proof.",
              },
            ].map((p) => (
              <div
                key={p.pg}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <span className="flex-none min-w-[44px] h-7 bg-tint text-navy border border-tint-2 rounded-[7px] grid place-items-center text-[12px] font-bold px-2">
                  {p.pg}
                </span>
                <div>
                  <b>{p.title}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "witness":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Named persons
            </h4>
            {[
              {
                role: "Complainant",
                name: "Rajesh Kumar Mehta",
                desc: "Director, CyberTech Solutions Pvt. Ltd.",
              },
              {
                role: "Respondent",
                name: "Priya Sharma",
                desc: "Authorized signatory, Global Logistics Corp.",
              },
              {
                role: "Witness",
                name: "Amit Deshmukh",
                desc: "Project Manager — present at contract signing.",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <div>
                  <span className="block text-[11.5px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-0.5">
                    {p.role}
                  </span>
                  <b>{p.name}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Designated contacts
            </h4>
            {[
              {
                role: "Counsel (A)",
                name: "Adv. Sneha Iyer",
                desc: "Senior Advocate, High Court of Bombay.",
              },
              {
                role: "Counsel (B)",
                name: "Adv. Rakesh Menon",
                desc: "Partner, Menon & Associates.",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-3 py-2.5 border-b border-sutra-line-2"
              >
                <div>
                  <span className="block text-[11.5px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-0.5">
                    {p.role}
                  </span>
                  <b>{p.name}</b>
                  <br />
                  <span className="text-[14px] text-sutra-ink-3">{p.desc}</span>
                </div>
              </div>
            ))}
            <div className="mt-3">
              <span className="block text-[11.5px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-0.5">
                Mediator
              </span>
              <span className="text-[14px] text-sutra-ink-3">
                To be appointed by the court or by agreement of parties.
              </span>
            </div>
          </div>
        </div>
      );

    case "police":
      return (
        <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1">
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Police station
            </h4>
            <div className="mb-3">
              <b>Koramangala Police Station</b>
              <br />
              <span className="text-[14px] text-sutra-ink-3">
                Outer Bangalore Urban District, Karnataka
              </span>
            </div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              FIR details
            </h4>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                FIR No.
              </span>
              <b>0042/2026</b>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                Date
              </span>
              <b>15 March 2026</b>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                Sections
              </span>
              <b>IPC 420, 406, 34</b>
            </div>
          </div>
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3">
              Investigating Officer
            </h4>
            <div className="mb-3">
              <span className="block text-[11.5px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-0.5">
                IO
              </span>
              <b>SI Venkatesh R.</b>
              <br />
              <span className="text-[14px] text-sutra-ink-3">
                Badge No. KPT-2847
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                Contact
              </span>
              <b>+91 80 2294 0042</b>
            </div>
            <div className="flex items-baseline gap-2.5 py-1.5 border-b border-sutra-line-2">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                Status
              </span>
              <b className="text-green-ink">Chargesheet filed</b>
            </div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-3 mt-4">
              Court
            </h4>
            <div className="flex items-baseline gap-2.5 py-1.5">
              <span className="text-sutra-ink-3 min-w-[90px] flex-none text-[14px]">
                Assigned to
              </span>
              <b>29th Additional Chief Metropolitan Magistrate</b>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
