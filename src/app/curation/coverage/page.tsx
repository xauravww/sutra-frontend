"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusCoverage,
  CASE_TYPE_OPTIONS,
  CORPUS_COURT_TYPES,
  CORPUS_COURT_TYPE_LABELS,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";

/**
 * Coverage heatmap — where the corpus is thin.
 *
 * The point of this screen is the empty cells, not the full ones: a state/year
 * with no published judgments is a sourcing task. Counts are published-only,
 * because an unpublished document answers nobody's question.
 */

/** Five buckets is enough to read density without a legend nobody studies. */
function cellTone(count: number, max: number): string {
  if (count === 0) return "bg-sutra-line-2 text-sutra-ink-3";
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.66) return "bg-navy text-white";
  if (ratio > 0.33) return "bg-navy/80 text-white";
  if (ratio > 0.12) return "bg-navy/50 text-white";
  return "bg-tint-2 text-sutra-ink-2";
}

export default function CurationCoveragePage() {
  const { toast } = useNotify();
  const [data, setData] = useState<CorpusCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [caseType, setCaseType] = useState("");
  const [courtType, setCourtType] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await corpusService.getCoverage({
          case_type: caseType || undefined,
          court_type: courtType || undefined,
          year_from: yearFrom ? Number(yearFrom) : undefined,
          year_to: yearTo ? Number(yearTo) : undefined,
        })
      );
    } catch (error) {
      toast(corpusErrorMessage(error, "Could not load coverage"), "error");
    } finally {
      setLoading(false);
    }
  }, [caseType, courtType, yearFrom, yearTo, toast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Cells arrive as a flat list; the grid needs `state × year`, summed across
   * case types so one filter change does not restructure the table.
   */
  const grid = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    for (const cell of data?.cells ?? []) {
      const key = `${cell.state}|${cell.year}`;
      const next = (map.get(key) ?? 0) + cell.count;
      map.set(key, next);
      if (next > max) max = next;
    }
    return { map, max };
  }, [data]);

  const gaps = useMemo(() => {
    if (!data) return 0;
    return data.states.length * data.years.length - grid.map.size;
  }, [data, grid]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sutra-ink">Coverage</h1>
          <p className="text-sm text-sutra-ink-3 mt-1">
            Published judgments by state and year. Empty cells are the sourcing
            backlog.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2.5 border border-sutra-line rounded-lg text-sutra-ink-2 hover:bg-white transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <Icon name="refresh" className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-sutra-line p-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold text-sutra-ink-2 mb-1">
            Case type
          </span>
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value)}
            className="border border-sutra-line rounded-lg px-3 py-2 text-sm min-w-48 outline-none focus:border-navy"
          >
            <option value="">All case types</option>
            {CASE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-sutra-ink-2 mb-1">
            Court type
          </span>
          <select
            value={courtType}
            onChange={(e) => setCourtType(e.target.value)}
            className="border border-sutra-line rounded-lg px-3 py-2 text-sm min-w-48 outline-none focus:border-navy"
          >
            <option value="">All court types</option>
            {CORPUS_COURT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CORPUS_COURT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-sutra-ink-2 mb-1">
            Year from
          </span>
          <input
            type="number"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="1950"
            className="border border-sutra-line rounded-lg px-3 py-2 text-sm w-28 outline-none focus:border-navy"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-sutra-ink-2 mb-1">
            Year to
          </span>
          <input
            type="number"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder={String(new Date().getFullYear())}
            className="border border-sutra-line rounded-lg px-3 py-2 text-sm w-28 outline-none focus:border-navy"
          />
        </label>
        {(caseType || courtType || yearFrom || yearTo) && (
          <button
            onClick={() => {
              setCaseType("");
              setCourtType("");
              setYearFrom("");
              setYearTo("");
            }}
            className="px-3 py-2 text-sm text-sutra-ink-2 hover:text-sutra-ink"
          >
            Clear
          </button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryTile label="Published judgments" value={data.total} />
          <SummaryTile label="States covered" value={data.states.length} />
          <SummaryTile label="Years covered" value={data.years.length} />
          <SummaryTile
            label="Empty state × year cells"
            value={gaps}
            tone={gaps > 0 ? "warn" : "good"}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-sutra-line-2 rounded" />
            ))}
          </div>
        ) : !data || data.cells.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="grid" className="mx-auto w-7 h-7 text-sutra-line mb-3" />
            <p className="text-sutra-ink font-bold">Nothing to plot yet</p>
            <p className="text-sm text-sutra-ink-3 mt-1">
              Coverage counts only published judgments that carry both a state
              and a year.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">
                Published judgment counts by state and year
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 bg-white z-10 text-left px-4 py-3 text-xs font-bold text-sutra-ink-2 border-b border-sutra-line"
                  >
                    State
                  </th>
                  {data.years.map((year) => (
                    <th
                      key={year}
                      scope="col"
                      className="px-2 py-3 text-xs font-bold text-sutra-ink-2 border-b border-sutra-line"
                    >
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.states.map((state) => (
                  <tr key={state}>
                    <th
                      scope="row"
                      className="sticky left-0 bg-white z-10 text-left px-4 py-2 text-xs font-semibold text-sutra-ink whitespace-nowrap border-b border-sutra-line-2"
                    >
                      {state}
                    </th>
                    {data.years.map((year) => {
                      const count = grid.map.get(`${state}|${year}`) ?? 0;
                      return (
                        <td
                          key={year}
                          className="border-b border-sutra-line-2 p-0.5 text-center"
                        >
                          <span
                            title={`${state} · ${year}: ${count} published`}
                            className={`block rounded text-xs py-1.5 tabular-nums ${cellTone(
                              count,
                              grid.max
                            )}`}
                          >
                            {count || "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs text-sutra-ink-3">
        <Icon name="info" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Documents missing a state or a year never appear here. Fix their
        metadata in the queue so gaps reflect real sourcing gaps, not blank
        fields.
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "good";
}) {
  const valueTone =
    tone === "warn"
      ? "text-amber-ink"
      : tone === "good"
      ? "text-green-ink"
      : "text-sutra-ink";
  return (
    <div className="bg-white rounded-xl border border-sutra-line p-4">
      <p className="text-xs text-sutra-ink-3">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${valueTone}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
