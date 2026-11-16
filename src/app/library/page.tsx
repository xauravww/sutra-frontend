"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/lib/auth-context";
import { library } from "@/lib/library";
import { corpusService, CORPUS_SORT_OPTIONS, CORPUS_COURT_TYPE_LABELS, MONTH_LABELS, type CorpusDocument, type CorpusCourtType, type CorpusFacets, type CorpusListParams, type CorpusSortField } from "@/lib/corpus";
import { Spinner } from "@/components/ui/Button";
import { SearchInput, FilterSelect, EmptyState, ErrorState } from "@/components/admin/ui";

const PAGE_SIZE = 30;
const ALLOWED_ROLES = ["judiciary", "legal_practitioner", "admin", "owner"];

/**
 * Pull the case identifier out of a corpus citation like
 * `1013622_HBHC010235882023_1_2025-10-16_d39813d9d7c9` →
 * `{ code: "HBHC", caseNo: "0102358" }`.
 */
function decodeCaseId(citation: string): { code: string; caseNo: string } | null {
  const m = citation.match(/_([A-Za-z]+)(\d+)/);
  if (!m) return null;
  const digits = m[2];
  const caseNo = digits.length > 4 ? digits.slice(0, -4) : digits;
  return { code: m[1], caseNo };
}

function courtTypeLabel(t?: string | null): string {
  if (!t) return "";
  return CORPUS_COURT_TYPE_LABELS[t as CorpusCourtType] ?? t;
}

const fmtDecisionDate = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<CorpusDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [facets, setFacets] = useState<CorpusFacets | null>(null);
  const [courtType, setCourtType] = useState("");
  const [court, setCourt] = useState("");
  const [caseType, setCaseType] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [judge, setJudge] = useState("");
  const [year, setYear] = useState("");
  const [benchType, setBenchType] = useState("");
  const [bench, setBench] = useState("");
  const [month, setMonth] = useState("");
  const [sortBy, setSortBy] = useState<CorpusSortField>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [opening, setOpening] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);

  const canAccess = !!user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (user && !canAccess) {
      router.replace(user.role === "owner" || user.role === "admin" ? "/admin" : "/workspace");
    }
  }, [user, canAccess, router]);

  // Filter/sort vocabulary from the published corpus itself.
  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    corpusService.getFacets().then((f) => { if (!cancelled) setFacets(f); }).catch(() => { if (!cancelled) setFacets(null); });
    return () => { cancelled = true; };
  }, [canAccess]);

  const runQuery = useCallback(async (opts: { offset: number; append: boolean }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const params: Partial<CorpusListParams> = {
      search: appliedSearch || undefined,
      court: court || undefined,
      court_type: courtType || undefined,
      case_type: caseType || undefined,
      state: stateFilter || undefined,
      judge: judge || undefined,
      year: year ? Number(year) : undefined,
      bench: bench || undefined,
      bench_type: benchType || undefined,
      month: month ? Number(month) : undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      limit: PAGE_SIZE,
      offset: opts.offset,
    };
    try {
      const res = await library.listDocuments(params);
      setTotal(res.total);
      setItems((prev) => (opts.append ? [...prev, ...res.items] : res.items));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load documents");
      if (!opts.append) setItems([]);
    } finally {
      busyRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
    }, [appliedSearch, court, courtType, caseType, stateFilter, judge, year, benchType, bench, month, sortBy, sortDir]);

  // First page — re-runs whenever the toolbar state changes (resets the list).
  useEffect(() => {
    if (!canAccess) return;
    setInitialLoading(true);
    setItems([]);
    setTotal(0);
    runQuery({ offset: 0, append: false });
  }, [runQuery, canAccess]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Infinite scroll.
  useEffect(() => {
    if (!canAccess || initialLoading) return;
    if (items.length >= total) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !busyRef.current && items.length < total) {
          setLoadingMore(true);
          runQuery({ offset: items.length, append: true });
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canAccess, initialLoading, items.length, total, runQuery]);

  const openDocument = useCallback(async (doc: CorpusDocument) => {
    if (opening) return;
    setOpening(doc.id);
    try {
      const source = await corpusService.getPublishedSource(doc.id);
      if (source.pdf_url) {
        window.open(source.pdf_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // leave enabled so the user can retry
    } finally {
      setOpening(null);
    }
  }, [opening]);

  const toOptions = (values: string[] | undefined) =>
    (values ?? []).map((v) => ({
      value: v,
      label: v.includes("_")
        ? v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : v,
    }));

  const years: string[] = [];
  if (facets?.year_min != null && facets.year_max != null && facets.year_max > facets.year_min) {
    for (let y = facets.year_max; y >= facets.year_min; y -= 1) years.push(String(y));
  }

  const filterCount = [courtType, court, caseType, stateFilter, judge, year, benchType, bench, month].filter(Boolean).length;

  const clearFilters = () => {
    setCourtType("");
    setCourt("");
    setCaseType("");
    setStateFilter("");
    setJudge("");
    setYear("");
    setBenchType("");
    setBench("");
    setMonth("");
  };

  const pickSort = (value: string) => {
    const option = CORPUS_SORT_OPTIONS.find((o) => o.value === value);
    setSortBy((option?.value as CorpusSortField) ?? "updated_at");
    setSortDir(option?.defaultDir ?? "desc");
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-sutra-bg grid place-items-center">
        <Spinner className="w-6 h-6 text-navy" />
      </div>
    );
  }

  if (!canAccess) {
    return <div className="min-h-dvh bg-sutra-bg" />;
  }

  return (
    <div className="min-h-dvh bg-sutra-bg">
      <TopBar />
      <main className="max-w-[940px] mx-auto px-4 sm:px-6 py-2 sm:py-4">
        <div className="mb-5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-navy mb-2">Knowledge base</p>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-sutra-ink">Library</h1>
          <p className="text-[14px] sm:text-[15px] text-sutra-ink-3 mt-1">
            Case-law corpus documents — search, filter and sort, then open the judgment.
          </p>
        </div>

        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search citation, title or parties..."
              className="flex-1 min-w-[220px]"
            />
            <FilterSelect
              value={sortBy}
              onChange={pickSort}
              options={CORPUS_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              allLabel="Sort"
            />
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-[42px] px-3 rounded-xl border border-sutra-line bg-white text-sutra-ink-2 text-[13px] font-semibold hover:border-navy/40 hover:text-navy transition-colors"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              {sortDir === "asc" ? "A→Z ↑" : "Z→A ↓"}
            </button>
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
            {year && (
              <FilterSelect value={month} onChange={setMonth} options={MONTH_LABELS.map((label, i) => ({ value: String(i + 1), label }))} allLabel="All months" />
            )}
            {(facets?.bench_types?.length ?? 0) > 0 && (
              <FilterSelect value={benchType} onChange={setBenchType} options={toOptions(facets?.bench_types)} allLabel="All bench sizes" />
            )}
            {(facets?.benches?.length ?? 0) > 0 && (
              <FilterSelect value={bench} onChange={setBench} options={toOptions(facets?.benches)} allLabel="All benches" />
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

          {initialLoading ? (
            <div className="py-10 grid place-items-center"><Spinner className="w-6 h-6 text-navy" /></div>
          ) : loadError && items.length === 0 ? (
            <ErrorState title="Couldn't load documents" message={loadError} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No matching documents"
              description="No published case-law documents match your search and filters."
            />
          ) : (
            <>
              <p className="text-[12px] text-sutra-ink-3 mb-3">
                {total} document{total === 1 ? "" : "s"}
                {appliedSearch ? ` matching “${appliedSearch}”` : ""}
                {filterCount > 0 ? ` · ${filterCount} filter${filterCount === 1 ? "" : "s"}` : ""}
              </p>
              <div className="divide-y divide-sutra-line-2">
                {items.map((doc) => {
                  const dec = decodeCaseId(doc.citation);
                  const primary = doc.court || (dec ? `Case ${dec.caseNo}` : doc.title);
                  const meta = [
                    dec?.caseNo ? `Case No. ${dec.caseNo}` : "",
                    doc.court_type ? courtTypeLabel(doc.court_type) : "",
                    doc.year ? String(doc.year) : "",
                    fmtDecisionDate(doc.decision_date),
                    doc.state ? doc.state.replace(/_/g, " ") : "",
                  ].filter(Boolean).join(" · ");
                  return (
                    <div key={doc.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-sutra-ink truncate">{primary}</p>
                          <p className="text-[12px] text-sutra-ink-3 mt-0.5 truncate">{meta || "Case-law document"}</p>
                          {(doc.parties || doc.judges || doc.outcome) && (
                            <p className="text-[12.5px] text-sutra-ink-2 mt-0.5 line-clamp-2">
                              {[doc.parties, doc.judges].filter(Boolean).join(" — ")}
                              {doc.outcome ? ` · ${doc.outcome}` : ""}
                            </p>
                          )}
                          <p className="font-mono text-[11px] text-sutra-ink-3 mt-0.5 truncate">{doc.citation}</p>
                        </div>
                        <button
                          onClick={() => openDocument(doc)}
                          disabled={opening === doc.id}
                          className="h-8 px-3 rounded-lg border border-navy bg-white text-navy text-[12px] font-bold inline-flex items-center hover:bg-navy hover:text-white transition-colors disabled:opacity-60 flex-none"
                        >
                          {opening === doc.id ? "Opening…" : "Open"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={sentinelRef} className="pt-4">
                {loadingMore && (
                  <div className="py-3 grid place-items-center"><Spinner className="w-5 h-5 text-navy" /></div>
                )}
                {!loadingMore && items.length >= total && total > 0 && (
                  <p className="text-center text-[12px] text-sutra-ink-3 py-2">End of results.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
