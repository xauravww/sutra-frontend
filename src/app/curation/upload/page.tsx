"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  corpusService,
  corpusErrorMessage,
  type CorpusMetadata,
  CASE_TYPE_OPTIONS,
  CORPUS_COURT_TYPES,
  CORPUS_COURT_TYPE_LABELS,
  CORPUS_BENCH_TYPES,
  CORPUS_BENCH_TYPE_LABELS,
} from "@/lib/corpus";
import { INDIAN_STATES } from "@/lib/indian-states";
import { useNotify } from "@/components/ui/Notify";
import { Icon } from "@/components/curation/icons";

const MAX_BYTES = 50 * 1024 * 1024;
const CURRENT_YEAR = new Date().getFullYear();

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FormState = CorpusMetadata & { year: string };

const EMPTY_FORM: FormState = {
  citation: "",
  title: "",
  parties: "",
  court: "",
  court_type: "",
  bench: "",
  bench_type: "",
  state: "",
  year: "",
  decision_date: "",
  case_type: "",
  judges: "",
  outcome: "",
  language: "en",
  source_url: "",
};

export default function CurationUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useNotify();

  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const acceptFile = useCallback((candidate: File) => {
    if (candidate.type !== "application/pdf") {
      toast("Only PDF files are accepted", "error");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      toast("PDF exceeds the 50 MB limit", "error");
      return;
    }
    setFile(candidate);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  }, [toast]);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  };

  /**
   * Mirrors the server's zod schema. The server is authoritative — this only
   * saves a round trip on obvious mistakes.
   */
  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!file) next.file = "Attach the judgment PDF";
    if (form.citation.trim().length < 3)
      next.citation = "Citation is required";
    if (form.title.trim().length < 3) next.title = "Title is required";

    if (form.year) {
      const year = Number(form.year);
      if (!Number.isInteger(year) || year < 1800 || year > CURRENT_YEAR + 1) {
        next.year = `Enter a year between 1800 and ${CURRENT_YEAR + 1}`;
      }
    }

    if (form.source_url) {
      try {
        new URL(form.source_url);
      } catch {
        next.source_url = "Enter a valid URL";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) {
      toast("Fix the highlighted fields before uploading", "error");
      return;
    }

    setSubmitting(true);
    setProgress(0);

    try {
      const document = await corpusService.createDocument(
        file!,
        { ...form, year: form.year || undefined },
        setProgress
      );
      toast(
        "Uploaded. Text extraction and indexing have started in the background.",
        "success"
      );
      router.push(`/curation/${document.id}`);
    } catch (error) {
      toast(corpusErrorMessage(error, "Upload failed"), "error");
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/curation"
          className="inline-flex items-center gap-1.5 text-sm text-sutra-ink-3 hover:text-sutra-ink transition-colors no-underline"
        >
          <Icon name="arrow-left" className="w-4 h-4" />
          Back to queue
        </Link>
        <h1 className="text-2xl font-bold text-sutra-ink mt-3">
          Upload judgment
        </h1>
        <p className="text-sm text-sutra-ink-3 mt-1">
          Attach the PDF and describe it. Text extraction, chunking and indexing
          run automatically once you save.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PDF */}
        <section className="bg-white rounded-xl border border-sutra-line p-5">
          <h2 className="text-sm font-bold text-sutra-ink mb-3">
            Judgment PDF
          </h2>

          {file ? (
            <div className="flex items-center gap-3 p-4 bg-tint border border-sutra-line rounded-lg">
              <Icon name="file-text" className="w-5 h-5 text-sutra-ink-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sutra-ink truncate">
                  {file.name}
                </p>
                <p className="text-xs text-sutra-ink-3">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!submitting && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 text-sutra-ink-3 hover:text-sutra-ink hover:bg-tint-2 rounded transition-colors flex-shrink-0"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-navy bg-tint"
                  : errors.file
                  ? "border-red-300 bg-red-50/40"
                  : "border-sutra-line hover:border-sutra-ink-3 hover:bg-tint/40"
              }`}
            >
              <Icon name="upload-cloud" className="mx-auto w-7 h-7 text-sutra-ink-3 mb-2" />
              <p className="text-sm font-semibold text-sutra-ink">
                Drop the PDF here, or click to browse
              </p>
              <p className="text-xs text-sutra-ink-3 mt-1">PDF only, up to 50 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) acceptFile(selected);
                  e.target.value = "";
                }}
              />
            </div>
          )}
          {errors.file && <FieldError message={errors.file} />}
        </section>

        {/* Required metadata */}
        <section className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-sutra-ink">
              Identification
            </h2>
            <p className="text-xs text-sutra-ink-3 mt-0.5">
              The citation must be unique across the corpus.
            </p>
          </div>

          <Field
            label="Citation"
            required
            error={errors.citation}
            hint="e.g. 2019 SCC OnLine P&H 4471"
          >
            <input
              type="text"
              value={form.citation}
              onChange={(e) => setField("citation", e.target.value)}
              className={inputClass(errors.citation)}
              placeholder="2019 SCC OnLine P&H 4471"
            />
          </Field>

          <Field label="Case title" required error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className={inputClass(errors.title)}
              placeholder="State of Haryana v. Ram Kumar"
            />
          </Field>

          <Field label="Parties" hint="Full party names as given in the cause title">
            <input
              type="text"
              value={form.parties}
              onChange={(e) => setField("parties", e.target.value)}
              className={inputClass()}
              placeholder="State of Haryana vs Ram Kumar son of Bishan Singh"
            />
          </Field>
        </section>

        {/* Classification — these fields drive search filters */}
        <section className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-sutra-ink">
              Classification
            </h2>
            <p className="text-xs text-sutra-ink-3 mt-0.5">
              These fields become search filters and are embedded into the index,
              so accuracy matters.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Court">
              <input
                type="text"
                value={form.court}
                onChange={(e) => setField("court", e.target.value)}
                className={inputClass()}
                placeholder="Punjab and Haryana High Court"
              />
            </Field>

            <Field label="Court type">
              <select
                value={form.court_type}
                onChange={(e) => setField("court_type", e.target.value)}
                className={inputClass()}
              >
                <option value="">Select court type</option>
                {CORPUS_COURT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CORPUS_COURT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="State">
              <select
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                className={inputClass()}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Bench / registry" hint="HC bench location, e.g. Chandigarh">
              <input
                type="text"
                value={form.bench}
                onChange={(e) => setField("bench", e.target.value)}
                className={inputClass()}
                placeholder="Chandigarh"
              />
            </Field>

            <Field label="Bench type">
              <select
                value={form.bench_type}
                onChange={(e) => setField("bench_type", e.target.value)}
                className={inputClass()}
              >
                <option value="">Select bench type</option>
                {CORPUS_BENCH_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CORPUS_BENCH_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Year" error={errors.year}>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setField("year", e.target.value)}
                className={inputClass(errors.year)}
                placeholder={String(CURRENT_YEAR)}
                min={1800}
                max={CURRENT_YEAR + 1}
              />
            </Field>

            <Field
              label="Decision date"
              hint="Full date if known (YYYY-MM-DD)"
            >
              <input
                type="date"
                value={form.decision_date}
                onChange={(e) => setField("decision_date", e.target.value)}
                className={inputClass()}
                max={new Date().toISOString().split("T")[0]}
              />
            </Field>

            <Field label="Case type">
              <select
                value={form.case_type}
                onChange={(e) => setField("case_type", e.target.value)}
                className={inputClass()}
              >
                <option value="">Select type</option>
                {CASE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Optional context */}
        <section className="bg-white rounded-xl border border-sutra-line p-5 space-y-4">
          <h2 className="text-sm font-bold text-sutra-ink">
            Additional detail
          </h2>

          <Field label="Judges">
            <input
              type="text"
              value={form.judges}
              onChange={(e) => setField("judges", e.target.value)}
              className={inputClass()}
              placeholder="M. S. Grewal, Anita Chaudhry"
            />
          </Field>

          <Field
            label="Outcome"
            hint="A one- or two-line summary of what the court held"
          >
            <textarea
              value={form.outcome}
              onChange={(e) => setField("outcome", e.target.value)}
              rows={3}
              className={inputClass()}
              placeholder="Appeal allowed; acquittal set aside; convicted under Section 304A IPC."
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Source URL" error={errors.source_url}>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => setField("source_url", e.target.value)}
                className={inputClass(errors.source_url)}
                placeholder="https://phhc.gov.in/..."
              />
            </Field>

            <Field label="Language">
              <select
                value={form.language}
                onChange={(e) => setField("language", e.target.value)}
                className={inputClass()}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="bn">Bengali</option>
                <option value="gu">Gujarati</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="pa">Punjabi</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4 pb-4">
          <Link
            href="/curation"
            className="px-4 py-2.5 text-sm font-semibold text-sutra-ink-2 hover:text-sutra-ink transition-colors no-underline"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3">
            {submitting && progress > 0 && progress < 100 && (
              <span className="text-sm text-sutra-ink-3 tabular-nums">
                {progress}%
              </span>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Icon name="spinner" className="animate-spin" />
                  {progress >= 100 ? "Processing..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Icon name="upload-cloud" />
                  Upload and index
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none transition-colors ${
    error
      ? "border-red-300 focus:border-red-400"
      : "border-sutra-line focus:border-navy"
  }`;
}

function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-sutra-ink-2 mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-sutra-ink-3 mt-1">{hint}</p>
      )}
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-red-700 mt-1.5">
      <Icon name="alert-circle" className="w-3 h-3" />
      {message}
    </p>
  );
}
