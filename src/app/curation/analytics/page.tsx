"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusSearchAnalytics,
  type CorpusFeedbackSummary,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";

/**
 * Search analytics and relevance feedback.
 *
 * The two lists that matter are the ones nobody enjoys reading: zero-result
 * queries (users asked, we had nothing) and worst-rated documents (we had
 * something, it did not help). Both are sourcing and curation work-lists,
 * which is why they are given more room than the vanity totals.
 */

const WINDOWS = [7, 30, 90, 365];

export default function CurationAnalyticsPage() {
  const { toast } = useNotify();
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState<CorpusSearchAnalytics | null>(null);
  const [feedback, setFeedback] = useState<CorpusFeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [searchData, feedbackData] = await Promise.all([
        corpusService.getSearchAnalytics(days),
        corpusService.getFeedbackSummary(days),
      ]);
      setSearch(searchData);
      setFeedback(feedbackData);
    } catch (error) {
      toast(corpusErrorMessage(error, "Could not load analytics"), "error");
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const zeroRate = search ? Math.round(search.zero_result_rate * 100) : 0;
  const relevanceRate =
    feedback?.relevance_rate === null || feedback === null
      ? null
      : Math.round(feedback.relevance_rate * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-sutra-ink">Analytics</h1>
          <p className="text-sm text-sutra-ink-3 mt-1">
            What users searched for, what they got nothing for, and whether the
            results helped.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-sutra-line bg-white overflow-hidden">
            {WINDOWS.map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  days === option
                    ? "bg-navy text-white"
                    : "text-sutra-ink-2 hover:bg-tint"
                }`}
              >
                {option}d
              </button>
            ))}
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Searches" value={search?.searches ?? 0} />
        <Tile
          label="Zero-result rate"
          value={`${zeroRate}%`}
          tone={zeroRate > 20 ? "bad" : "neutral"}
        />
        <Tile label="Source clicks" value={search?.source_clicks ?? 0} />
        <Tile label="Distinct users" value={search?.distinct_users ?? 0} />
        <Tile
          label="Rated relevant"
          value={relevanceRate === null ? "no votes" : `${relevanceRate}%`}
          tone={
            relevanceRate === null
              ? "neutral"
              : relevanceRate < 60
              ? "bad"
              : "good"
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel
          icon={<Icon name="search-x" className="text-red-700" />}
          title="Zero-result queries"
          hint="Nothing published matched. This is the sourcing backlog."
          empty="No zero-result searches in this window."
          count={search?.zero_result_queries.length ?? 0}
          loading={loading}
        >
          {search?.zero_result_queries.map((row) => (
            <li key={row.query} className="flex items-start justify-between gap-3 p-3">
              <span className="text-sm text-sutra-ink break-words min-w-0">
                {row.query}
              </span>
              <span className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                {row.searches}× · {new Date(row.last_seen).toLocaleDateString()}
              </span>
            </li>
          ))}
        </Panel>

        <Panel
          icon={<Icon name="search" className="text-sutra-ink-3" />}
          title="Top queries"
          hint="What the corpus is actually being asked."
          empty="No searches recorded in this window."
          count={search?.top_queries.length ?? 0}
          loading={loading}
        >
          {search?.top_queries.map((row) => (
            <li key={row.query} className="flex items-start justify-between gap-3 p-3">
              <span className="text-sm text-sutra-ink break-words min-w-0">
                {row.query}
              </span>
              <span className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                {row.searches}× · avg {row.avg_results} hits
              </span>
            </li>
          ))}
        </Panel>

        <Panel
          icon={<Icon name="pointer" className="text-sutra-ink-3" />}
          title="Most opened judgments"
          hint="Cited sources users actually clicked through to."
          empty="No source clicks in this window."
          count={search?.most_clicked.length ?? 0}
          loading={loading}
        >
          {search?.most_clicked.map((row) => (
            <li
              key={row.document_id}
              className="flex items-start justify-between gap-3 p-3"
            >
              <Link
                href={`/curation/${row.document_id}`}
                className="text-sm text-sutra-ink hover:underline break-words min-w-0 no-underline"
              >
                {row.citation}
              </Link>
              <span className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                {row.clicks} opens
              </span>
            </li>
          ))}
        </Panel>

        <Panel
          icon={<Icon name="thumbs-down" className="text-amber-ink" />}
          title="Worst-rated judgments"
          hint="Retrieved often, marked unhelpful. Check the metadata and chunking."
          empty="No negative ratings in this window."
          count={feedback?.worst_documents.length ?? 0}
          loading={loading}
        >
          {feedback?.worst_documents.map((row) => (
            <li
              key={row.document_id}
              className="flex items-start justify-between gap-3 p-3"
            >
              <Link
                href={`/curation/${row.document_id}`}
                className="text-sm text-sutra-ink hover:underline break-words min-w-0 no-underline"
              >
                {row.citation}
              </Link>
              <span className="text-xs text-amber-ink whitespace-nowrap flex-shrink-0">
                {row.irrelevant}/{row.votes} unhelpful
              </span>
            </li>
          ))}
        </Panel>
      </div>

      <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        <header className="px-4 py-3 border-b border-sutra-line">
          <h2 className="text-sm font-bold text-sutra-ink">
            Recent feedback
          </h2>
          <p className="text-xs text-sutra-ink-3 mt-0.5">
            The query each vote was cast against — read them together, a vote
            without its question means nothing.
          </p>
        </header>
        {!feedback || feedback.recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">
            Nobody has rated a result in this window.
          </p>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {feedback.recent.map((entry) => (
              <li key={entry.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          entry.relevant
                            ? "bg-green-bg text-green-ink"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {entry.relevant ? "Helpful" : "Not helpful"}
                      </span>
                      <Link
                        href={`/curation/${entry.document.id}`}
                        className="text-sm font-semibold text-sutra-ink hover:underline truncate no-underline"
                      >
                        {entry.document.citation}
                      </Link>
                    </div>
                    <p className="text-xs text-sutra-ink-2 mt-1.5 break-words">
                      &ldquo;{entry.query}&rdquo;
                    </p>
                    {entry.note && (
                      <p className="text-xs text-sutra-ink-3 mt-1 break-words">
                        {entry.note}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                    {new Date(entry.created_at).toLocaleString()}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs text-sutra-ink-3">
        <Icon name="info" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Ratings are one per user per query per document — re-voting overwrites,
        so these percentages reflect opinions held, not clicks made.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueTone =
    tone === "bad"
      ? "text-red-700"
      : tone === "good"
      ? "text-green-ink"
      : "text-sutra-ink";
  return (
    <div className="bg-white rounded-xl border border-sutra-line p-4">
      <p className="text-xs text-sutra-ink-3">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${valueTone}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function Panel({
  icon,
  title,
  hint,
  empty,
  count,
  loading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  empty: string;
  count: number;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
      <header className="px-4 py-3 border-b border-sutra-line">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-sutra-ink">{title}</h2>
        </div>
        <p className="text-xs text-sutra-ink-3 mt-0.5">{hint}</p>
      </header>
      {loading ? (
        <div className="p-4 space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-sutra-line-2 rounded" />
          ))}
        </div>
      ) : count === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">{empty}</p>
      ) : (
        <ul className="divide-y divide-sutra-line max-h-96 overflow-y-auto">
          {children}
        </ul>
      )}
    </section>
  );
}
