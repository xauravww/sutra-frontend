import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy · Sutra",
  description: "Privacy policy and data governance practices for Sutra.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-sutra-bg text-sutra-ink font-inter">
      <header className="sticky top-0 z-40 border-b border-sutra-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Sutra home">
            <Logo className="h-6 w-auto sm:h-7" />
          </Link>
          <div className="flex items-center gap-4 text-[14px]">
            <Link href="/terms" className="text-sutra-ink-2 hover:text-navy transition-colors">
              Terms of Service
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center bg-navy px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <div className="border border-sutra-line bg-white p-8 sm:p-12 shadow-xs">
            <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.015em] text-sutra-ink font-serif">
              Privacy Policy
            </h1>
            <p className="mt-2 text-[13.5px] text-sutra-ink-3">
              Last updated: November 2026
            </p>

            <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-sutra-ink-2">
              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  1. Judicial and Dispute Resolution Confidentiality
                </h2>
                <p>
                  Sutra is built specifically for adjudicators, mediators, and legal practitioners.
                  We treat all case filings, party submissions, exhibits, and notes with strict confidentiality.
                  Your matter data is isolated to your organization and is never shared, sold, or used to train public machine learning models.
                </p>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  2. Information We Collect
                </h2>
                <p className="mb-2">We collect only information necessary to operate the platform securely:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-sutra-ink-2">
                  <li>Account details: name, official email address, organization or court affiliation, and authentication credentials.</li>
                  <li>Matter records: documents, pleadings, orders, and attachments uploaded by authorized users.</li>
                  <li>Audit trails: system access logs, document verification timestamps, and action records maintained for evidentiary integrity.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  3. Data Storage and Security
                </h2>
                <p>
                  All case records and filings are encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.
                  Access control follows strict role-based authorization ensuring only assigned judges, mediators, and bench staff can access specific matter dossiers.
                </p>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  4. Data Retention and Deletion
                </h2>
                <p>
                  You retain complete ownership of all uploaded matter records. Organizations may export case records or request permanent deletion of matter files and associated indexes upon conclusion of proceedings.
                </p>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  5. Contact Us
                </h2>
                <p>
                  If you have questions regarding this Privacy Policy or institutional compliance requirements, please reach out through your organization administrator or contact our support team.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-sutra-line bg-white py-8 text-sutra-ink-3">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-5 sm:flex-row text-[13px]">
          <p>&copy; {new Date().getFullYear()} Sutra. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-navy transition-colors">
              Home
            </Link>
            <Link href="/terms" className="hover:text-navy transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
