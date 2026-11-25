import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Scale } from "lucide-react";
import Logo from "@/components/Logo";
import CaseHandlingSection from "@/components/CaseHandlingSection";

export const metadata: Metadata = {
  title: "Sutra · For judges & mediators",
  description:
    "Assemble the record, then decide. Sutra turns scattered case material into one clear, reviewable record.",
};

const serif = "font-serif";
const sans = "font-inter";

export default function Home() {
  return (
    <div className={`min-h-screen flex flex-col bg-sutra-bg text-sutra-ink ${sans}`}>
      <Nav />
      <main id="main-content" className="flex-1">
        <Hero />
        <Statement />
        <CaseHandlingSection />
        <ClosingBand />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-sutra-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center" aria-label="Sutra home">
            <Logo className="h-6 w-auto sm:h-7" />
          </Link>
          <nav className="hidden md:flex items-center gap-6" aria-label="Sections">
            <a
              href="#how-cases-are-handled"
              className="text-[14px] font-medium text-sutra-ink-2 transition-colors hover:text-navy"
            >
              How Cases Are Handled
            </a>
          </nav>
        </div>
        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Account">
          <Link
            href="/login"
            className="hidden text-[15px] font-medium text-sutra-ink-2 transition-colors hover:text-navy min-[420px]:inline"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-navy px-3.5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark sm:px-5 sm:text-[15px]"
          >
            Get started
            <ArrowRight className="hidden h-4 w-4 sm:block" strokeWidth={2} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-sutra-line bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_auto]">
        <div className="max-w-3xl">
          <h1 className={`text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] text-sutra-ink sm:text-[66px] ${serif}`}>
            A clear case record
            <br />
            Then a confident <span className="text-navy">decision</span>
          </h1>
          <div className="mt-7 max-w-xl">
            <p className="text-[17px] leading-relaxed text-sutra-ink-2">
              Sutra brings scattered filings, evidence and notes into one clean folder.
              Built for judges, mediators and lawyers to review evidence faster and decide with certainty.
            </p>
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-navy px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-navy-dark"
            >
              Start for free
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <a
              href="#how-cases-are-handled"
              className="inline-flex items-center justify-center border border-sutra-line bg-white px-6 py-3.5 text-[15px] font-medium text-sutra-ink transition-colors hover:border-navy hover:text-navy"
            >
              See how cases are handled
            </a>
          </div>
        </div>

        <Medallion />
      </div>
    </section>
  );
}

function Medallion() {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 5 * Math.PI) / 180;
    const major = i % 9 === 0;
    const r1 = major ? 39 : 42;
    const r2 = 47;
    return (
      <line
        key={i}
        x1={50 + Math.cos(a) * r1}
        y1={50 + Math.sin(a) * r1}
        x2={50 + Math.cos(a) * r2}
        y2={50 + Math.sin(a) * r2}
        stroke={major ? "#1E4E79" : "#DFE3EA"}
        strokeWidth={major ? 1.2 : 0.8}
      />
    );
  });

  return (
    <div className="mx-auto hidden items-center justify-center lg:flex">
      <div className="relative" style={{ width: 280, height: 280 }}>
        <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
          <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#1E4E79" strokeWidth="1" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#DFE3EA" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#DFE3EA" strokeWidth="0.8" />
          {ticks}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-navy/30 bg-tint">
            <Scale className="h-7 w-7 text-navy" strokeWidth={1.8} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Statement() {
  return (
    <section className="border-b border-sutra-line bg-sutra-bg">
      <div className="mx-auto max-w-4xl px-5 py-20 sm:py-24">
        <p className={`text-[28px] font-medium leading-[1.25] tracking-[-0.015em] text-sutra-ink sm:text-[38px] ${serif}`}>
          When all documents, evidence and notes are in one clear place,
          making the right decision becomes simple. Sutra keeps everything organized from day one.
        </p>
      </div>
    </section>
  );
}

function ClosingBand() {
  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:py-24">
        <h2 className={`text-[32px] font-semibold tracking-[-0.015em] text-white sm:text-[44px] ${serif}`}>
          A case worth deciding starts with a clear record
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16.5px] leading-relaxed text-white/80">
          Set up the workspace in minutes and run the first matter with verified citations from filing to final order.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white px-7 py-3.5 text-[15px] font-medium text-navy transition-colors hover:bg-tint"
          >
            Start for free
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-sutra-line bg-white py-12 text-sutra-ink-2">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo className="h-6 w-auto" />
          <span className="text-[13px] font-medium text-sutra-ink-3">Legal Intelligence Workspace</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-[14px]">
          <Link href="/login" className="hover:text-navy transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-navy transition-colors">
            Get started
          </Link>
          <a href="#how-cases-are-handled" className="hover:text-navy transition-colors">
            How cases are handled
          </a>
          <Link href="/privacy" className="hover:text-navy transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-navy transition-colors">
            Terms of Service
          </Link>
        </div>
        <p className="text-[12.5px] text-sutra-ink-3">
          &copy; {new Date().getFullYear()} Sutra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
