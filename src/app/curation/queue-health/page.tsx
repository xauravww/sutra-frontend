"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusQueueHealth,
  CORPUS_STATUS_META,
} from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";

/**
 * Ingestion queue monitor.
 *
 * Two independent sources of truth, deliberately shown side by side: BullMQ
 * knows about jobs, the database knows about documents. A document stuck in
 * `processing` with no job behind it is invisible to the queue but very
 * visible here — that mismatch is the failure mode worth catching.
 */

/** Job states BullMQ reports, in the order a job moves through them. */
const COUNT_ORDER = ["waiting", "active", "delayed", "completed", "failed", "paused"];

const AUTO_REFRESH_MS = 20_000;

export default function CurationQueueHealthPage() {
  const { toast } = useNotify();
  const [data, setData] = useState<CorpusQueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      setData(await corpusService.getQueueHealth());
    } catch (error) {
      toast(corpusErrorMessage(error, "Could not load queue health"), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // A monitor that needs a manual refresh is not a monitor.
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sutra-ink">
            Ingestion queue
          </h1>
          <p className="text-sm text-sutra-ink-3 mt-1">
            Job depth, failures and documents that stopped moving. Refreshes
            every {AUTO_REFRESH_MS / 1000}s.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2.5 border border-sutra-line rounded-lg text-sutra-ink-2 hover:bg-white transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <Icon name="refresh" className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {data && !data.queue_reachable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-bg p-4">
          <Icon name="wifi-off" className="w-[18px] h-[18px] text-amber-ink mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-ink">Queue unreachable</p>
            <p className="text-amber-ink mt-0.5">
              Redis did not answer, so job counts below are blank rather than
              zero. Uploads still succeed; processing resumes once the worker
              reconnects.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-sutra-line" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {COUNT_ORDER.map((key) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-sutra-line p-4"
            >
              <p className="text-xs text-sutra-ink-3 capitalize">{key}</p>
              <p
                className={`text-2xl font-bold mt-1 tabular-nums ${
                  key === "failed" && (data?.counts[key] ?? 0) > 0
                    ? "text-red-700"
                    : "text-sutra-ink"
                }`}
              >
                {data?.queue_reachable ? data.counts[key] ?? 0 : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-sutra-line">
          <Icon name="alert-triangle" className="w-4 h-4 text-red-700" />
          <h2 className="text-sm font-bold text-sutra-ink">Failed jobs</h2>
          <span className="text-xs text-sutra-ink-3">
            {data?.failed.length ?? 0} shown
          </span>
        </header>
        {!data || data.failed.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">
            No failed jobs. Reprocess a document from its detail page if one
            appears here.
          </p>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {data.failed.map((job) => (
              <li key={job.job_id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      {job.document_id ? (
                        <Link
                          href={`/curation/${job.document_id}`}
                          className="font-semibold text-sutra-ink hover:underline no-underline"
                        >
                          Document #{job.document_id}
                        </Link>
                      ) : (
                        <span className="font-semibold text-sutra-ink">
                          Job {job.job_id}
                        </span>
                      )}
                      <span className="text-xs text-sutra-ink-3">
                        {job.attempts} attempt{job.attempts === 1 ? "" : "s"}
                      </span>
                    </div>
                    {job.failed_reason && (
                      <p className="mt-1.5 text-xs font-mono text-red-700 break-all">
                        {job.failed_reason}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                    {job.failed_at
                      ? new Date(job.failed_at).toLocaleString()
                      : "unknown time"}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-sutra-line overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-sutra-line">
          <Icon name="clock" className="w-4 h-4 text-amber-ink" />
          <h2 className="text-sm font-bold text-sutra-ink">
            Stalled documents
          </h2>
          <span className="text-xs text-sutra-ink-3">
            untouched for 30+ minutes
          </span>
        </header>
        {!data || data.stalled.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-sutra-ink-3">
            Nothing stalled. Documents in draft or processing are all moving.
          </p>
        ) : (
          <ul className="divide-y divide-sutra-line">
            {data.stalled.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/curation/${doc.id}`}
                    className="text-sm font-semibold text-sutra-ink hover:underline truncate block no-underline"
                  >
                    {doc.citation}
                  </Link>
                  <p className="text-xs text-sutra-ink-3 mt-0.5">
                    {CORPUS_STATUS_META[doc.status]?.label ?? doc.status}
                  </p>
                </div>
                <time className="text-xs text-sutra-ink-3 whitespace-nowrap flex-shrink-0">
                  last change {new Date(doc.updated_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs text-sutra-ink-3">
        <Icon name="activity" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Job counts come from BullMQ; stalled documents come from the database.
        A stalled document with no failed job usually means the worker died
        mid-run — reprocess it.
      </p>
    </div>
  );
}
