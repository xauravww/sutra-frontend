"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusDocument,
  type CorpusChunk,
  type CorpusAuditEntry,
  type CorpusMetadata,
  CASE_TYPE_OPTIONS,
  CORPUS_COURT_TYPES,
  CORPUS_COURT_TYPE_LABELS,
  CORPUS_BENCH_TYPES,
  CORPUS_BENCH_TYPE_LABELS,
} from "@/lib/corpus";
import { canCurate, canDelete } from "@/lib/corpus-roles";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import { INDIAN_STATES } from "@/lib/indian-states";
import CorpusStatusBadge from "@/components/curation/CorpusStatusBadge";
import { Icon, type IconName } from "@/components/curation/icons";

const CURRENT_YEAR = new Date().getFullYear();
/** Chunks fetched per "Load more". Sized so a short judgment arrives whole. */
const CHUNK_PAGE = 25;

type Tab = "review" | "metadata" | "audit";

export default function CurationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast, confirm } = useNotify();
  const id = Number(idParam);

  const isCurator = user ? canCurate(user.role) : false;
  const isDeleter = user ? canDelete(user.role) : false;

  const [doc, setDoc] = useState<CorpusDocument | null>(null);
  const [chunks, setChunks] = useState<CorpusChunk[]>([]);
  const [chunkTotal, setChunkTotal] = useState(0);
  const [chunksLoading, setChunksLoading] = useState(false);
  /** How many chunks are on screen. A ref, so `loadChunks` stays referentially
   *  stable and the polling effect below doesn't restart on every append. */
  const loadedCountRef = useRef(0);
  const [audit, setAudit] = useState<CorpusAuditEntry[]>([]);
  const [tab, setTab] = useState<Tab>("review");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CorpusMetadata> | null>(null);
  const [staleIndex, setStaleIndex] = useState(false);

  const loadDocument = useCallback(
    async (silent = false) => {
      if (!Number.isFinite(id)) return;
      if (!silent) setLoading(true);
      try {
        const document = await corpusService.getDocument(id);
        setDoc(document);
        setForm({
          citation: document.citation,
          title: document.title,
          parties: document.parties ?? "",
          court: document.court ?? "",
          court_type: document.court_type ?? "",
          state: document.state ?? "",
          bench: document.bench ?? "",
          bench_type: document.bench_type ?? "",
          year: document.year ?? "",
          // Already a plain YYYY-MM-DD from the API, which is what
          // <input type="date"> expects.
          decision_date: document.decision_date ?? "",
          case_type: document.case_type ?? "",
          judges: document.judges ?? "",
          outcome: document.outcome ?? "",
          source_url: document.source_url ?? "",
        });
      } catch (error) {
        toast(corpusErrorMessage(error, "Could not load the document"), "error");
        router.push("/curation");
      } finally {
        setLoading(false);
      }
    },
    [id, router, toast]
  );

  /**
   * Chunks read as one continuous judgment, so they accumulate rather than
   * paginate — a curator verifying extraction should never lose their place by
   * clicking through pages. `append` is false for the initial load and for the
   * reloads that follow an action, both of which must replace what is on screen.
   */
  const loadChunks = useCallback(
    async (append = false) => {
      if (!Number.isFinite(id)) return;
      setChunksLoading(true);
      try {
        const from = append ? loadedCountRef.current : 0;
        const result = await corpusService.getChunks(id, CHUNK_PAGE, from);
        setChunks((prev) => {
          const next = append ? [...prev, ...result.chunks] : result.chunks;
          loadedCountRef.current = next.length;
          return next;
        });
        setChunkTotal(result.total);
      } catch {
        // A document that failed extraction has no chunks; the status conveys that.
      } finally {
        setChunksLoading(false);
      }
    },
    [id]
  );

  const loadAudit = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      setAudit(await corpusService.getDocumentAudit(id));
    } catch (error) {
      toast(corpusErrorMessage(error, "Could not load the audit trail"), "error");
    }
  }, [id, toast]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    loadChunks();
  }, [loadChunks]);

  useEffect(() => {
    if (tab === "audit") loadAudit();
  }, [tab, loadAudit]);

  // Poll while the pipeline is still working on this document.
  useEffect(() => {
    if (doc?.status !== "processing" && doc?.status !== "draft") return;
    const interval = setInterval(() => {
      loadDocument(true);
      loadChunks();
    }, 4000);
    return () => clearInterval(interval);
  }, [doc?.status, loadDocument, loadChunks]);

  const run = async (
    key: string,
    action: () => Promise<unknown>,
    successMessage: string
  ) => {
    setBusy(key);
    try {
      await action();
      toast(successMessage, "success");
      await loadDocument(true);
      await loadChunks();
      if (tab === "audit") await loadAudit();
    } catch (error) {
      toast(corpusErrorMessage(error, "Action failed"), "error");
    } finally {
      setBusy(null);
    }
  };

  const handleSaveMetadata = async () => {
    if (!form) return;
    setBusy("save");
    try {
      const result = await corpusService.updateDocument(id, {
        ...form,
        year: form.year === "" ? undefined : form.year,
      });
      setStaleIndex(result.requiresReingestion);
      toast(result.message || "Metadata saved successfully", "success");
      await loadDocument(true);
    } catch (error) {
      toast(corpusErrorMessage(error, "Could not save metadata"), "error");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete document",
      message: `Permanently delete "${doc?.citation}"? This removes the document, its search index, its audit history and the stored PDF. This cannot be undone. Consider archiving instead.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await corpusService.deleteDocument(id);
      toast("Document deleted", "success");
      router.push("/curation");
    } catch (error) {
      toast(corpusErrorMessage(error, "Could not delete the document"), "error");
      setBusy(null);
    }
  };

  if (loading || !doc || !form) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-sutra-line-2 rounded animate-pulse" />
        <div className="h-32 bg-white border border-sutra-line rounded-xl animate-pulse" />
        <div className="h-64 bg-white border border-sutra-line rounded-xl animate-pulse" />
      </div>
    );
  }

  const setField = (key: keyof CorpusMetadata, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/curation"
          className="inline-flex items-center gap-1.5 text-sm text-sutra-ink-3 hover:text-sutra-ink transition-colors no-underline"
        >
          <Icon name="arrow-left" className="w-4 h-4" />
          Back to queue
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-sutra-line p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-sutra-ink">
                {doc.title}
              </h1>
              <CorpusStatusBadge status={doc.status} />
            </div>
            <p className="text-sm font-mono text-sutra-ink-3 mt-1">
              {doc.citation}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-sutra-ink-3">
              {doc.court && <span>{doc.court}</span>}
              {doc.bench && <span>&middot; {doc.bench}</span>}
              {doc.state && <span>&middot; {doc.state}</span>}
              {(doc.decision_date || doc.year) && (
                <span>&middot; {doc.decision_date ?? doc.year}</span>
              )}
              {doc.bench_type && (
                <span>
                  &middot;{" "}
                  {CORPUS_BENCH_TYPE_LABELS[
                    doc.bench_type as keyof typeof CORPUS_BENCH_TYPE_LABELS
                  ] ?? doc.bench_type}
                </span>
              )}
              {doc._count && (
                <span>&middot; {doc._count.chunks} indexed chunks</span>
              )}
              {doc.uploader && (
                <span>&middot; uploaded by {doc.uploader.email}</span>
              )}
            </div>
          </div>

          {doc.pdf_url && (
            <a
              href={doc.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 border border-sutra-line rounded-lg text-sm text-sutra-ink-2 hover:bg-tint transition-colors flex-shrink-0 no-underline"
            >
              <Icon name="external-link" className="w-[15px] h-[15px]" />
              Open PDF
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-sutra-line">
          {isCurator && doc.status !== "published" && (
            <ActionButton
              onClick={() =>
                run(
                  "publish",
                  () => corpusService.publish(id),
                  "Published — this judgment is now searchable"
                )
              }
              busy={busy === "publish"}
              disabled={Boolean(busy) || (doc._count?.chunks ?? 0) === 0}
              tone="primary"
              icon={<Icon name="check" />}
              title={
                (doc._count?.chunks ?? 0) === 0
                  ? "Cannot publish: the document has no indexed chunks"
                  : undefined
              }
            >
              Publish
            </ActionButton>
          )}

          {isCurator && doc.status === "published" && (
            <ActionButton
              onClick={() =>
                run(
                  "unpublish",
                  () => corpusService.unpublish(id),
                  "Unpublished — removed from user search"
                )
              }
              busy={busy === "unpublish"}
              disabled={Boolean(busy)}
              icon={<Icon name="eye-off" />}
            >
              Unpublish
            </ActionButton>
          )}

          {isCurator && (
            <ActionButton
              onClick={() =>
                run("reprocess", async () => {
                  await corpusService.reprocess(id);
                  setStaleIndex(false);
                }, "Reprocessing queued")
              }
              busy={busy === "reprocess"}
              disabled={Boolean(busy)}
              icon={<Icon name="refresh" />}
            >
              Reprocess
            </ActionButton>
          )}

          {isCurator && doc.status !== "archived" && (
            <ActionButton
              onClick={() =>
                run("archive", () => corpusService.archive(id), "Archived")
              }
              busy={busy === "archive"}
              disabled={Boolean(busy)}
              icon={<Icon name="archive" />}
            >
              Archive
            </ActionButton>
          )}

          {isDeleter && (
            <ActionButton
              onClick={handleDelete}
              busy={busy === "delete"}
              disabled={Boolean(busy)}
              tone="danger"
              icon={<Icon name="trash" />}
            >
              Delete
            </ActionButton>
          )}
        </div>

        {staleIndex && (
          <Callout tone="warn">
            Metadata that is embedded in the search index has changed. Reprocess
            the document so the change reaches search results.
          </Callout>
        )}

        {doc.status === "failed" && (
          <Callout tone="error">
            Processing failed. Check the Activity tab for the reason, fix the
            underlying issue, then reprocess.
          </Callout>
        )}

        {doc.status === "needs_review" && isCurator && (
          <Callout tone="info">
            Read the extracted text below and confirm the metadata is right, then
            publish. Nothing reaches users until you do.
          </Callout>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-sutra-line">
        <nav className="flex gap-1 -mb-px">
          <TabButton
            active={tab === "review"}
            onClick={() => setTab("review")}
            icon={<Icon name="file-text" />}
          >
            Extracted text
            {chunkTotal > 0 && (
              <span className="ml-1 text-xs text-sutra-ink-3">{chunkTotal}</span>
            )}
          </TabButton>
          <TabButton
            active={tab === "metadata"}
            onClick={() => setTab("metadata")}
            icon={<Icon name="pencil" />}
          >
            Metadata
          </TabButton>
          <TabButton
            active={tab === "audit"}
            onClick={() => setTab("audit")}
            icon={<Icon name="history" />}
          >
            Activity
          </TabButton>
        </nav>
      </div>

      {/* Extracted text */}
      {tab === "review" && (
        <div className="space-y-3">
          {doc.status === "processing" || doc.status === "draft" ? (
            <div className="bg-white rounded-xl border border-sutra-line p-10 text-center">
              <Icon name="spinner" className="mx-auto w-6 h-6 text-sutra-ink-3 animate-spin mb-3" />
              <p className="text-sm font-bold text-sutra-ink">
                Extracting and indexing
              </p>
              <p className="text-xs text-sutra-ink-3 mt-1">
                This page refreshes on its own when processing finishes.
              </p>
            </div>
          ) : chunks.length === 0 ? (
            <div className="bg-white rounded-xl border border-sutra-line p-10 text-center">
              <Icon name="alert-triangle" className="mx-auto w-6 h-6 text-amber-ink mb-3" />
              <p className="text-sm font-bold text-sutra-ink">
                No text was indexed
              </p>
              <p className="text-xs text-sutra-ink-3 mt-1">
                The PDF may be image-only at too low a resolution, or extraction
                failed. Check the Activity tab.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs text-sutra-ink-3">
                  Text is stored as overlapping chunks — this is exactly what
                  search matches against. Verify it reads as the real judgment and
                  is not garbled OCR.
                </p>
                <p className="text-xs tabular-nums text-sutra-ink-3">
                  {chunks.length} of {chunkTotal}
                </p>
              </div>
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="bg-white rounded-xl border border-sutra-line overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-tint border-b border-sutra-line">
                    <span className="text-xs font-semibold text-sutra-ink-2">
                      Chunk {chunk.chunk_index + 1}
                    </span>
                    <span className="text-xs text-sutra-ink-3 font-mono">
                      {chunk.embedding_model} &middot; {chunk.dims}d
                    </span>
                  </div>
                  <pre className="p-4 text-sm text-sutra-ink-2 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                    {chunk.content}
                  </pre>
                </div>
              ))}

              {chunks.length < chunkTotal && (
                <button
                  onClick={() => loadChunks(true)}
                  disabled={chunksLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-sutra-line bg-white px-4 py-3 text-sm font-semibold text-sutra-ink-2 transition-colors hover:bg-tint disabled:opacity-60"
                >
                  {chunksLoading ? (
                    <>
                      <Icon name="spinner" className="animate-spin" />
                      Loading
                    </>
                  ) : (
                    `Load ${Math.min(CHUNK_PAGE, chunkTotal - chunks.length)} more`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Metadata editor */}
      {tab === "metadata" && (
        <div className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <EditField label="Citation">
              <input
                type="text"
                value={form.citation ?? ""}
                onChange={(e) => setField("citation", e.target.value)}
                className={editInputClass}
              />
            </EditField>
            <EditField label="Case title">
              <input
                type="text"
                value={form.title ?? ""}
                onChange={(e) => setField("title", e.target.value)}
                className={editInputClass}
              />
            </EditField>
          </div>

          <EditField label="Parties">
            <input
              type="text"
              value={form.parties ?? ""}
              onChange={(e) => setField("parties", e.target.value)}
              className={editInputClass}
            />
          </EditField>

          <div className="grid sm:grid-cols-2 gap-4">
            <EditField label="Court">
              <input
                type="text"
                value={form.court ?? ""}
                onChange={(e) => setField("court", e.target.value)}
                className={editInputClass}
              />
            </EditField>
            <EditField label="Court type">
              <select
                value={form.court_type ?? ""}
                onChange={(e) => setField("court_type", e.target.value)}
                className={editInputClass}
              >
                <option value="">Not set</option>
                {CORPUS_COURT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CORPUS_COURT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="State">
              <select
                value={form.state ?? ""}
                onChange={(e) => setField("state", e.target.value)}
                className={editInputClass}
              >
                <option value="">Not set</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Bench / registry">
              <input
                type="text"
                value={form.bench ?? ""}
                onChange={(e) => setField("bench", e.target.value)}
                className={editInputClass}
                placeholder="Chandigarh"
              />
            </EditField>
            <EditField label="Bench type">
              <select
                value={form.bench_type ?? ""}
                onChange={(e) => setField("bench_type", e.target.value)}
                className={editInputClass}
              >
                <option value="">Not set</option>
                {CORPUS_BENCH_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CORPUS_BENCH_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Year">
              <input
                type="number"
                value={form.year ?? ""}
                onChange={(e) => setField("year", e.target.value)}
                min={1800}
                max={CURRENT_YEAR + 1}
                className={editInputClass}
              />
            </EditField>
            <EditField label="Decision date">
              <input
                type="date"
                value={form.decision_date ?? ""}
                onChange={(e) => setField("decision_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className={editInputClass}
              />
            </EditField>
            <EditField label="Case type">
              <select
                value={form.case_type ?? ""}
                onChange={(e) => setField("case_type", e.target.value)}
                className={editInputClass}
              >
                <option value="">Not set</option>
                {CASE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </EditField>
          </div>

          <EditField label="Judges">
            <input
              type="text"
              value={form.judges ?? ""}
              onChange={(e) => setField("judges", e.target.value)}
              className={editInputClass}
            />
          </EditField>

          <EditField label="Outcome">
            <textarea
              value={form.outcome ?? ""}
              onChange={(e) => setField("outcome", e.target.value)}
              rows={3}
              className={editInputClass}
            />
          </EditField>

          <EditField label="Source URL">
            <input
              type="url"
              value={form.source_url ?? ""}
              onChange={(e) => setField("source_url", e.target.value)}
              className={editInputClass}
            />
          </EditField>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveMetadata}
              disabled={busy === "save"}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark disabled:opacity-60 transition-colors"
            >
              {busy === "save" ? (
                <Icon name="spinner" className="animate-spin" />
              ) : (
                <Icon name="save" />
              )}
              Save metadata
            </button>
          </div>
        </div>
      )}

      {/* Audit trail */}
      {tab === "audit" && (
        <div className="bg-white rounded-xl border border-sutra-line overflow-hidden">
          {audit.length === 0 ? (
            <p className="p-8 text-center text-sm text-sutra-ink-3">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-sutra-line">
              {audit.map((entry) => (
                <li key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-sutra-ink">
                        {formatAction(entry.action)}
                      </p>
                      <p className="text-xs text-sutra-ink-3 mt-0.5">
                        {entry.actor}
                      </p>
                      {entry.detail && (
                        <p className="text-xs text-sutra-ink-3 mt-1 font-mono break-all">
                          {entry.detail}
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
        </div>
      )}
    </div>
  );
}

const editInputClass =
  "w-full px-3 py-2 border border-sutra-line rounded-lg text-sm bg-white outline-none transition-colors focus:border-navy";

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-sutra-ink-2 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  disabled,
  icon,
  tone = "default",
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tone?: "default" | "primary" | "danger";
  title?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-navy text-white hover:bg-navy-dark border-navy"
      : tone === "danger"
      ? "text-red-700 border-red-300 hover:bg-red-50"
      : "text-sutra-ink-2 border-sutra-line hover:bg-tint";

  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${toneClass}`}
    >
      {busy ? <Icon name="spinner" className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-navy text-navy"
          : "border-transparent text-sutra-ink-3 hover:text-sutra-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "info" | "warn" | "error";
  children: React.ReactNode;
}) {
  const classes = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    warn: "bg-amber-bg text-amber-ink border-amber-300",
    error: "bg-red-50 text-red-800 border-red-300",
  }[tone];

  return (
    <div className={`mt-4 p-3 rounded-lg border text-sm ${classes}`}>
      {children}
    </div>
  );
}

/** `ingestion_completed` → `Ingestion completed` */
function formatAction(action: string): string {
  const text = action.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
