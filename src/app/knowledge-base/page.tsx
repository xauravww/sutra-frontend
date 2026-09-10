"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth-context";
import { corpusService, type CorpusDocument, type CorpusFacets } from "@/lib/corpus";
import { Spinner } from "@/components/ui/Button";
import { SearchInput, FilterSelect, EmptyState, ErrorState, StatusBadge } from "@/components/admin/ui";

const OFFICIAL_CONSTITUTION_URL = "https://www.legislative.gov.in/documents/constitution-of-india/constitution-of-india-AjN2EjMtQWa?pageTitle=Constitution-of-India";
const LEGISLATIVE_DOCUMENTS_URL = "https://www.legislative.gov.in/documents?page=1";
const ENGLISH_CONSTITUTION_PDF_URL = "https://www.legislative.gov.in/static/uploads/2025/07/c9fe9c9b6840524844316f74bb1c556c.pdf";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

/** One label/value row inside the document viewer. */
function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-2.5 border-b border-sutra-line-2 last:border-b-0">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-sutra-ink-3 mb-1">{label}</p>
      <div className="text-[13px] text-sutra-ink break-words">{value}</div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  // The box is debounced into this; the selects below apply immediately.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [facets, setFacets] = useState<CorpusFacets | null>(null);
  const [court, setCourt] = useState("");
  const [courtType, setCourtType] = useState("");
  const [caseType, setCaseType] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [judge, setJudge] = useState("");
  const [year, setYear] = useState("");
  const [viewDoc, setViewDoc] = useState<CorpusDocument | null>(null);
  // The `pdf_url` on a corpus document is the bare Wasabi object URL, and that
  // bucket denies public reads — linking it straight from the row lands the
  // user on an AccessDenied XML page. Only the /source endpoint returns a
  // presigned URL, so the viewer fetches it when it opens.
  const [viewPdf, setViewPdf] = useState<string | null>(null);
  const [viewPdfState, setViewPdfState] = useState<"loading" | "ready" | "failed">("loading");

  const isOwner = !!user && user.role === "owner";

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.replace("/curation");
    }
  }, [router, user]);

  // Search runs server-side (citation/title/parties — see
  // CorpusDocumentService.buildListWhere). Only the text box is debounced;
  // dropdowns apply on change, so they must not sit behind the timer.
  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filter vocabulary is read from the corpus itself rather than hardcoded —
  // a hardcoded "Bombay" that no published judgment carries is a filter that
  // silently returns nothing. Cached server-side for 5 minutes.
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    corpusService
      .getFacets()
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => { if (!cancelled) setFacets(null); });
    return () => { cancelled = true; };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    // The timer keeps setLoading out of the effect body, and `cancelled` stops
    // a slow response from overwriting a newer query's results.
    const t = setTimeout(() => {
      setLoading(true);
      corpusService
        .listDocuments({
          status: "published",
          limit: 100,
          sort_by: "updated_at",
          sort_dir: "desc",
          search: appliedSearch || undefined,
          court: court || undefined,
          court_type: courtType || undefined,
          case_type: caseType || undefined,
          state: stateFilter || undefined,
          judge: judge || undefined,
          year: year ? Number(year) : undefined,
        })
        .then((result) => {
          if (cancelled) return;
          setDocuments(result.items);
          setLoadError("");
        })
        .catch((e) => {
          if (cancelled) return;
          setDocuments([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load sources");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [appliedSearch, court, courtType, caseType, stateFilter, judge, year, isOwner]);

  // Resolve the presigned PDF for whichever document the viewer has open.
  // Reset happens in openView (an event handler) so this effect body stays free
  // of synchronous setState.
  const viewId = viewDoc?.id;
  useEffect(() => {
    if (viewId == null) return;
    let cancelled = false;
    corpusService
      .getPublishedSource(viewId)
      .then((source) => {
        if (cancelled) return;
        setViewPdf(source.pdf_url);
        setViewPdfState(source.pdf_url ? "ready" : "failed");
      })
      .catch(() => {
        if (cancelled) return;
        setViewPdf(null);
        setViewPdfState("failed");
      });
    return () => { cancelled = true; };
  }, [viewId]);

  const openView = (doc: CorpusDocument) => {
    // Only reset when switching documents — reopening the same one leaves
    // `viewId` unchanged, so the effect above would not re-run and the viewer
    // would sit on "Preparing secure link…" forever.
    if (doc.id !== viewDoc?.id) {
      setViewPdf(null);
      setViewPdfState("loading");
    }
    setViewDoc(doc);
  };

  if (!isOwner) {
    return <div className="min-h-dvh bg-sutra-bg" />;
  }

  const query = appliedSearch;

  // Values drawn from a closed enum (court/bench/case type) arrive snake_cased
  // — "supreme_court". Label them readably, but keep the raw value: it is what
  // the API validates against.
  const toOptions = (values: string[] | undefined) =>
    (values ?? []).map((v) => ({
      value: v,
      label: v.includes("_")
        ? v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : v,
    }));

  // Only offer a year range that actually spans something — a single published
  // year makes the select a no-op.
  const years: string[] = [];
  if (facets?.year_min != null && facets.year_max != null && facets.year_max > facets.year_min) {
    for (let y = facets.year_max; y >= facets.year_min; y -= 1) years.push(String(y));
  }

  const filterCount = [court, courtType, caseType, stateFilter, judge, year].filter(Boolean).length;

  const clearFilters = () => {
    setCourt("");
    setCourtType("");
    setCaseType("");
    setStateFilter("");
    setJudge("");
    setYear("");
  };

  return (
    <AdminShell>
      <div className="max-w-[940px] mx-auto py-2 sm:py-4">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-navy mb-2">Owner workspace</p>
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-sutra-ink">Knowledge Base</h1>
            <p className="text-[14px] sm:text-[15px] text-sutra-ink-3 mt-1">Manage the authoritative legal sources used to ground AI answers.</p>
          </div>
          <Link href="/knowledge-base/upload" className="inline-flex items-center gap-2 rounded-xl bg-navy text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-navy-dark">
            <span className="text-lg leading-none">+</span> Add source
          </Link>
        </div>

        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-tint text-navy grid place-items-center flex-none" aria-hidden="true">⚖</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-bold text-sutra-ink">Seed the Constitution of India</h2>
              <p className="text-[13px] text-sutra-ink-3 mt-1 max-w-2xl">Use the official Legislative Department edition, then upload it for extraction, review, and publication. The source remains versioned and can be replaced when a newer edition is released.</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <a href={OFFICIAL_CONSTITUTION_URL} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy hover:underline">Open Constitution page ↗</a>
                <a href={ENGLISH_CONSTITUTION_PDF_URL} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy hover:underline">English PDF ↗</a>
                <a href={LEGISLATIVE_DOCUMENTS_URL} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy hover:underline">All documents ↗</a>
                <Link href="/knowledge-base/upload" className="text-[13px] font-semibold text-navy hover:underline">Upload this edition</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[16px] font-bold text-sutra-ink">Published legal sources</h2>
              <p className="text-[13px] text-sutra-ink-3 mt-0.5">Only published sources are available to answer-generation retrieval.</p>
            </div>
            <Link href="/knowledge-base/queue" className="text-[13px] font-semibold text-navy hover:underline flex-none">Manage queue</Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by title, citation or parties..."
              className="flex-1 min-w-[220px]"
            />
            {(facets?.court_types?.length ?? 0) > 0 && (
              <FilterSelect value={courtType} onChange={setCourtType} options={toOptions(facets?.court_types)} allLabel="All court types" />
            )}
            {(facets?.courts?.length ?? 0) > 0 && (
              <FilterSelect value={court} onChange={setCourt} options={toOptions(facets?.courts)} allLabel="All courts" />
            )}
            {(facets?.case_types?.length ?? 0) > 0 && (
              <FilterSelect value={caseType} onChange={setCaseType} options={toOptions(facets?.case_types)} allLabel="All case types" />
            )}
            {(facets?.states?.length ?? 0) > 0 && (
              <FilterSelect value={stateFilter} onChange={setStateFilter} options={toOptions(facets?.states)} allLabel="All states" />
            )}
            {(facets?.judges?.length ?? 0) > 0 && (
              <FilterSelect value={judge} onChange={setJudge} options={toOptions(facets?.judges)} allLabel="All judges" />
            )}
            {years.length > 0 && (
              <FilterSelect value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: y }))} allLabel="All years" />
            )}
            {filterCount > 0 && (
              <button
                onClick={clearFilters}
                className="h-[42px] px-3 rounded-xl border border-sutra-line bg-white text-sutra-ink-2 text-[13px] font-semibold hover:border-navy/40 hover:text-navy transition-colors"
              >
                Clear {filterCount} filter{filterCount === 1 ? "" : "s"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 grid place-items-center"><Spinner className="w-6 h-6 text-navy" /></div>
          ) : loadError ? (
            <ErrorState title="Couldn't load sources" message={loadError} />
          ) : documents.length === 0 ? (
            query || filterCount > 0 ? (
              <div className="rounded-xl border border-dashed border-sutra-line-2 bg-slate-50 px-4 py-8 text-center text-[13px] text-sutra-ink-3">
                <p>
                  No published sources match
                  {query ? ` “${query}”` : ""}
                  {query && filterCount > 0 ? " with" : ""}
                  {filterCount > 0 ? ` ${filterCount} filter${filterCount === 1 ? "" : "s"} applied` : ""}.
                </p>
                {filterCount > 0 && (
                  <button onClick={clearFilters} className="mt-2 text-[13px] font-semibold text-navy hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                title="No published sources yet"
                description="Upload and publish an official source to begin grounding answers."
              />
            )
          ) : (
            <>
              <p className="text-[12px] text-sutra-ink-3 mb-2">
                {documents.length} source{documents.length === 1 ? "" : "s"}
                {query ? ` matching “${query}”` : ""}
                {filterCount > 0 ? ` with ${filterCount} filter${filterCount === 1 ? "" : "s"} applied` : ""}
              </p>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-sutra-line-2 px-3.5 py-3 hover:border-navy/40 hover:bg-tint/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-sutra-ink truncate">{doc.title}</p>
                      <p className="text-[12px] text-sutra-ink-3 mt-0.5 truncate">
                        {[doc.citation, doc.court, doc.year].filter(Boolean).join(" · ") || "Published legal source"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Published</span>
                      <button
                        onClick={() => openView(doc)}
                        className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold inline-flex items-center hover:bg-navy hover:text-white transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {viewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewDoc(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-xl border border-sutra-line shadow-xl">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-sutra-line sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-bold text-sutra-ink-3 whitespace-nowrap">SOURCE #{viewDoc.id}</span>
                <StatusBadge status={viewDoc.status} />
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="h-8 w-8 rounded-lg border border-sutra-line bg-white text-sutra-ink-2 grid place-items-center hover:bg-tint hover:text-sutra-ink transition-colors flex-none"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5">
              <h3 className="text-[16px] font-bold text-sutra-ink mb-1">{viewDoc.title}</h3>
              <p className="text-[13px] text-sutra-ink-3 mb-4">{viewDoc.citation || "No citation recorded"}</p>

              <div className="rounded-xl border border-sutra-line px-4 py-1">
                <Meta label="Parties" value={viewDoc.parties || "—"} />
                <Meta label="Court" value={[viewDoc.court, viewDoc.court_type].filter(Boolean).join(" · ") || "—"} />
                <Meta label="Bench" value={[viewDoc.bench, viewDoc.bench_type].filter(Boolean).join(" · ") || "—"} />
                <Meta label="Judges" value={viewDoc.judges || "—"} />
                <Meta label="State" value={viewDoc.state || "—"} />
                <Meta label="Year" value={viewDoc.year ? String(viewDoc.year) : "—"} />
                <Meta label="Decision date" value={viewDoc.decision_date || "—"} />
                <Meta label="Case type" value={viewDoc.case_type || "—"} />
                <Meta label="Outcome" value={viewDoc.outcome || "—"} />
                <Meta label="Language" value={viewDoc.language || "—"} />
                <Meta label="Indexed chunks" value={viewDoc._count?.chunks != null ? String(viewDoc._count.chunks) : "—"} />
                <Meta label="Uploaded by" value={viewDoc.uploader?.email ?? "—"} />
                <Meta label="Created" value={fmtDate(viewDoc.created_at)} />
                <Meta label="Updated" value={fmtDate(viewDoc.updated_at)} />
                <Meta
                  label="Source URL"
                  value={
                    viewDoc.source_url
                      ? <a href={viewDoc.source_url} target="_blank" rel="noreferrer" className="text-navy font-semibold break-all hover:underline">{viewDoc.source_url} ↗</a>
                      : "—"
                  }
                />
                <Meta
                  label="PDF"
                  value={
                    viewPdfState === "loading" ? (
                      <span className="text-sutra-ink-3">Preparing secure link…</span>
                    ) : viewPdfState === "ready" && viewPdf ? (
                      <a href={viewPdf} target="_blank" rel="noreferrer" className="text-navy font-semibold break-all hover:underline">Open PDF ↗</a>
                    ) : (
                      <span className="text-sutra-ink-3">
                        {viewDoc.pdf_url ? "Link unavailable — try again." : "No PDF attached."}
                      </span>
                    )
                  }
                />
                <Meta
                  label="File hash"
                  value={<code className="font-mono text-[11.5px] text-sutra-ink-2 break-all">{viewDoc.file_hash || "—"}</code>}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
