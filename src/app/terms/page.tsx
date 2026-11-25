import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms of Service · Sutra",
  description: "Terms of service and authorized usage guidelines for Sutra.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-sutra-bg text-sutra-ink font-inter">
      <header className="sticky top-0 z-40 border-b border-sutra-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Sutra home">
            <Logo className="h-6 w-auto sm:h-7" />
          </Link>
          <div className="flex items-center gap-4 text-[14px]">
            <Link href="/privacy" className="text-sutra-ink-2 hover:text-navy transition-colors">
              Privacy Policy
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
              Terms of Service
            </h1>
            <p className="mt-2 text-[13.5px] text-sutra-ink-3">
              Last updated: November 2026
            </p>

            <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-sutra-ink-2">
              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing or using Sutra, you agree to comply with and be bound by these Terms of Service.
                  If you are accessing the service on behalf of a court registry, institutional mediation center, or legal practice, you represent that you have authority to bind that entity.
                </p>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  2. Authorized Use and Account Responsibility
                </h2>
                <p className="mb-2">Users must maintain the confidentiality of their credentials and adhere to the following:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-sutra-ink-2">
                  <li>Only upload matter records and filings that you are legally authorized to access or manage.</li>
                  <li>Do not compromise platform security or attempt unauthorized access to other matters or tenant spaces.</li>
                  <li>Promptly report any unauthorized credential use or suspected security incident.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  3. Intellectual Property and Case Records
                </h2>
                <p>
                  All case files, filings, submissions, evidence, notes, and work product remain the exclusive property of the user and their respective organizations.
                  Sutra provides the indexing, verification, and workspace tools to organize and review those materials.
                </p>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  4. Service Availability
                </h2>
                <p>
                  We strive to maintain reliable platform availability for legal proceedings.
                  Scheduled maintenance is planned outside primary court operating hours whenever feasible.
                </p>
              </section>

              <section>
                <h2 className="text-[19px] font-semibold text-sutra-ink font-serif mb-2.5">
                  5. Contact Information
                </h2>
                <p>
                  For inquiries regarding terms, service agreements, or institutional onboarding, please contact our support team.
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
            <Link href="/privacy" className="hover:text-navy transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
