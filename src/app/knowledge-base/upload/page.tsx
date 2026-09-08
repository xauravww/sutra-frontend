"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth-context";
import { corpusService, corpusErrorMessage } from "@/lib/corpus";
import { useNotify } from "@/components/ui/Notify";
import { Spinner } from "@/components/ui/Button";

const SOURCE_TYPES = ["Constitution", "Act / statute", "Rules / regulations", "Legal book", "Commentary", "Government circular", "Other"];

export default function KnowledgeBaseUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useNotify();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("Legal book");
  const [year, setYear] = useState("");
  const [language, setLanguage] = useState("en");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user || user.role !== "owner") return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || title.trim().length < 3) {
      toast("Choose a PDF and enter a source title", "error");
      return;
    }
    setSubmitting(true);
    try {
      const document = await corpusService.createDocument(file, {
        citation: `KB-${Date.now()}`,
        title: title.trim(),
        case_type: sourceType,
        year: year || undefined,
        language,
        source_url: sourceUrl.trim() || undefined,
      });
      toast("Source uploaded. Extraction and indexing have started.", "success");
      router.push("/knowledge-base");
    } catch (error) {
      toast(corpusErrorMessage(error, "Source upload failed"), "error");
      setSubmitting(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto">
        <Link href="/knowledge-base" className="text-[13px] font-semibold text-sutra-ink-3 hover:text-navy">← Back to Knowledge Base</Link>
        <div className="mt-4 mb-6"><p className="text-[12px] font-bold uppercase tracking-widest text-navy mb-2">Owner workspace</p><h1 className="text-[28px] font-bold text-sutra-ink">Add knowledge source</h1><p className="text-[14px] text-sutra-ink-3 mt-1">Upload a Constitution, statute, legal book, rule, or official circular for review and indexing.</p></div>
        <form onSubmit={submit} className="space-y-5">
          <section className="bg-white border border-sutra-line rounded-2xl p-5"><h2 className="text-[15px] font-bold text-sutra-ink mb-3">Source PDF</h2><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => inputRef.current?.click()} className="w-full border-2 border-dashed border-sutra-line-2 rounded-xl px-4 py-8 text-center hover:border-navy hover:bg-tint/30 cursor-pointer"><span className="block text-[15px] font-semibold text-sutra-ink">{file ? file.name : "Choose a PDF"}</span><span className="block text-[13px] text-sutra-ink-3 mt-1">The document will be extracted, chunked, and sent through review.</span></button></section>
          <section className="bg-white border border-sutra-line rounded-2xl p-5 space-y-4"><h2 className="text-[15px] font-bold text-sutra-ink">Source details</h2><label className="block text-[13px] font-semibold text-sutra-ink-2">Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Constitution of India (2024 Edition)" className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] outline-none focus:border-navy" /></label><div className="grid sm:grid-cols-2 gap-4"><label className="block text-[13px] font-semibold text-sutra-ink-2">Source type<select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] bg-white outline-none focus:border-navy">{SOURCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="block text-[13px] font-semibold text-sutra-ink-2">Edition / year<input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="e.g. 2024" className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] outline-none focus:border-navy" /></label></div><div className="grid sm:grid-cols-2 gap-4"><label className="block text-[13px] font-semibold text-sutra-ink-2">Language<select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] bg-white outline-none focus:border-navy"><option value="en">English</option><option value="hi">Hindi</option><option value="bilingual">Bilingual</option></select></label><label className="block text-[13px] font-semibold text-sutra-ink-2">Official source URL <span className="font-normal text-sutra-ink-3">(optional)<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://legislative.gov.in/..." className="mt-1.5 w-full rounded-lg border border-sutra-line px-3 py-2.5 text-[14px] outline-none focus:border-navy" /></span></label></div></section>
          <div className="flex items-center justify-end gap-3"><Link href="/knowledge-base" className="px-4 py-2.5 text-[14px] font-semibold text-sutra-ink-2">Cancel</Link><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-navy text-white px-5 py-2.5 text-[14px] font-semibold hover:bg-navy-dark disabled:opacity-60 cursor-pointer disabled:cursor-default">{submitting && <Spinner className="w-4 h-4" />} {submitting ? "Uploading…" : "Upload and index"}</button></div>
        </form>
      </div>
    </AdminShell>
  );
}
