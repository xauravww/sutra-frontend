"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import Button, { Spinner } from "@/components/ui/Button";
import { judicialCases, type JudicialCaseDetail } from "@/lib/api";

type Tab = "overview" | "parties" | "witnesses" | "evidence" | "chronology" | "research";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Case Brief" },
  { key: "parties", label: "Parties & Accused" },
  { key: "witnesses", label: "Witnesses" },
  { key: "evidence", label: "Evidence" },
  { key: "chronology", label: "Chronology" },
  { key: "research", label: "Legal Research" },
];

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = Number(params.id);

  const [caseData, setCaseData] = useState<JudicialCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Only PDF files are supported");
      return;
    }
    setUploading(true);
    try {
      // For now, store locally — will connect to cloud storage later
      await judicialCases.updatePdf(caseId, {
        pdf_url: URL.createObjectURL(file),
        pdf_filename: file.name,
        pdf_size_bytes: file.size,
      });
      await fetchCase();
    } catch {
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await judicialCases.delete(caseId);
      router.push("/cases");
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[940px] mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-8 w-64 bg-sutra-line-2 rounded animate-pulse" />
            <div className="h-4 w-48 bg-sutra-line-2 rounded animate-pulse" />
            <div className="h-[400px] bg-white border border-sutra-line rounded-2xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[940px] mx-auto px-6 py-8 text-center">
          <p className="text-[17px] text-sutra-ink-3 mb-4">Case not found</p>
          <Link href="/cases" className="text-[15px] font-semibold text-navy hover:underline">
            ← Back to cases
          </Link>
        </main>
      </div>
    );
  }

  const hasData = caseData.case_brief || (caseData.parties as any[])?.length;

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />

      <main className="flex-1 max-w-[940px] mx-auto px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link
              href="/cases"
              className="text-[13px] font-semibold text-sutra-ink-3 hover:text-navy no-underline mb-2 inline-block"
            >
              ← Cases
            </Link>
            <h1 className="text-[28px] font-bold tracking-tight leading-snug">
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

        {/* PDF Upload Area */}
        {!caseData.pdf_filename && (
          <div
            className="border-2 border-dashed border-sutra-line rounded-2xl bg-white p-12 text-center cursor-pointer transition-colors hover:border-navy hover:bg-tint mb-6"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Spinner className="w-8 h-8 text-navy" />
                <p className="text-[15px] font-semibold text-sutra-ink-2">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-tint text-navy grid place-items-center mx-auto mb-4 border border-tint-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-sutra-ink mb-1">Upload Case File</h3>
                <p className="text-[15px] text-sutra-ink-2">
                  Drop your complete case PDF here, or click to browse
                </p>
                <p className="text-[13px] text-sutra-ink-3 mt-1">
                  FIR · Chargesheet · Statements · Evidence · Orders — all in one PDF
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleUpload(e.target.files[0]);
            e.target.value = "";
          }}
        />

        {/* Uploaded PDF info */}
        {caseData.pdf_filename && (
          <div className="flex items-center gap-3 bg-white border border-sutra-line rounded-xl px-5 py-3.5 mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5 text-navy flex-none">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            <span className="text-[15px] font-semibold text-sutra-ink truncate">{caseData.pdf_filename}</span>
            {caseData.page_count && (
              <span className="text-[13px] text-sutra-ink-3 flex-none">{caseData.page_count} pages</span>
            )}
            <span className="flex-1" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[13px] font-semibold text-navy hover:underline bg-transparent border-0 cursor-pointer"
            >
              Replace
            </button>
          </div>
        )}

        {/* Tabs */}
        {caseData.pdf_filename && (
          <>
            <div className="flex gap-1 border-b border-sutra-line mb-6 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-none px-4 py-3 text-[14px] font-semibold border-b-2 transition-colors bg-transparent border-0 border-b-2 cursor-pointer ${
                    activeTab === tab.key
                      ? "border-navy text-navy"
                      : "border-transparent text-sutra-ink-3 hover:text-sutra-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="bg-white border border-sutra-line rounded-2xl p-6 min-h-[300px]">
              {activeTab === "overview" && <OverviewTab data={caseData} />}
              {activeTab === "parties" && <PartiesTab data={caseData} />}
              {activeTab === "witnesses" && <WitnessesTab data={caseData} />}
              {activeTab === "evidence" && <EvidenceTab data={caseData} />}
              {activeTab === "chronology" && <ChronologyTab data={caseData} />}
              {activeTab === "research" && <ResearchTab data={caseData} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ─── Tab Components ─── */

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
        desc="AI will auto-generate a case brief after processing the PDF."
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
    return <EmptyState title="No parties identified" desc="AI will extract parties and accused from the case file." />;
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
    return <EmptyState title="No witnesses identified" desc="AI will extract witness names and statements from the case file." />;
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
    return <EmptyState title="No evidence mapped" desc="AI will classify and map evidence items from the case file." />;
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
    return <EmptyState title="No chronology yet" desc="AI will build a timeline from the case events." />;
  }
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-sutra-line" />
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
    return <EmptyState title="No legal research yet" desc="AI will identify relevant acts, sections, and precedents." />;
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
