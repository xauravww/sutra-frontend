"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth-context";
import { corpusService, type CorpusDocument } from "@/lib/corpus";
import { Spinner } from "@/components/ui/Button";

const OFFICIAL_CONSTITUTION_URL = "https://www.legislative.gov.in/documents/constitution-of-india/constitution-of-india-AjN2EjMtQWa?pageTitle=Constitution-of-India";
const LEGISLATIVE_DOCUMENTS_URL = "https://www.legislative.gov.in/documents?page=1";
const ENGLISH_CONSTITUTION_PDF_URL = "https://www.legislative.gov.in/static/uploads/2025/07/c9fe9c9b6840524844316f74bb1c556c.pdf";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.replace("/curation");
      return;
    }
    if (!user) return;
    void corpusService.listDocuments({ status: "published", limit: 100, sort_by: "updated_at", sort_dir: "desc" })
      .then((result) => setDocuments(result.items))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [router, user]);

  if (!user || user.role !== "owner") {
    return <div className="min-h-dvh bg-sutra-bg" />;
  }

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
            <Link href="/knowledge-base/queue" className="text-[13px] font-semibold text-navy hover:underline">Manage queue</Link>
          </div>

          {loading ? <div className="py-8 grid place-items-center"><Spinner className="w-6 h-6 text-navy" /></div> : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sutra-line-2 bg-slate-50 px-4 py-8 text-center text-[13px] text-sutra-ink-3">No published sources yet. Upload and publish an official source to begin grounding answers.</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Link key={doc.id} href="/knowledge-base/queue" className="flex items-center justify-between gap-3 rounded-xl border border-sutra-line-2 px-3.5 py-3 hover:border-navy/40 hover:bg-tint/20">
                  <div className="min-w-0"><p className="text-[14px] font-semibold text-sutra-ink truncate">{doc.title}</p><p className="text-[12px] text-sutra-ink-3 mt-0.5">{[doc.citation, doc.court, doc.year].filter(Boolean).join(" · ") || "Published legal source"}</p></div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 flex-none">Published</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
