import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Scale } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Sutra · For judges & mediators",
  description:
    "Assemble the record, then decide. Sutra turns scattered case material into one clear, reviewable record.",
};

const serif = "font-serif";
const sans = "font-inter";

export default function Home() {
  return (
    <div className={`min-h-screen flex flex-col bg-[#F5F1E9] text-[#1B1611] ${sans}`}>
      <Nav />
      <main id="main-content" className="flex-1">
        <Hero />
        <Statement />
        <WorkingRecord />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E2DAC9]/80 bg-[#F5F1E9]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-5">
        <Link href="/" className="flex items-center" aria-label="Sutra home">
          <Logo className="h-6 w-auto sm:h-7" />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Primary">
          <Link
            href="/login"
            className="hidden text-[15px] font-medium text-[#4A4238] transition-colors hover:text-[#1B1611] min-[420px]:inline"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-[#1B1611] px-3.5 py-2.5 text-[13px] font-medium text-[#F5F1E9] transition-colors hover:bg-[#1F3A2F] sm:px-5 sm:text-[15px]"
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
    <section className="relative overflow-hidden border-b border-[#E2DAC9]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_auto]">
        <div className="max-w-3xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#1F3A2F]">
            Case intelligence for judges, mediators and counsel
          </p>
          <h1 className={`mt-3 text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] sm:text-[66px] ${serif}`}>
            A clear case record
            <br />
            Then a confident <span className="text-[#1F3A2F]">decision</span>
          </h1>
          <div className="mt-7 max-w-xl">
            <p className="text-[17px] leading-relaxed text-[#4A4238]">
              Sutra brings scattered filings, evidence and annexes into one ordered
              record. Built specifically for judicial officers and dispute practitioners
              to review faster and decide with certainty.
            </p>
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#1F3A2F] px-6 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <a
              href="#working-record"
              className="inline-flex items-center justify-center border border-[#1B1611]/35 px-6 py-3.5 text-[15px] font-medium text-[#1B1611] transition-colors hover:border-[#1B1611]/70"
            >
              Explore the record
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
        stroke={major ? "#1F3A2F" : "#C4BAA7"}
        strokeWidth={major ? 1.2 : 0.8}
      />
    );
  });

  return (
    <div className="mx-auto hidden items-center justify-center lg:flex">
      <div className="relative" style={{ width: 280, height: 280 }}>
        <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
          <circle cx="50" cy="50" r="48" fill="#FBF9F3" stroke="#1F3A2F" strokeWidth="1" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#E2DAC9" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#E2DAC9" strokeWidth="0.8" />
          {ticks}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#1F3A2F]/50 bg-[#F5F1E9]/60">
            <Scale className="h-7 w-7 text-[#1F3A2F]" strokeWidth={1.8} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Statement() {
  return (
    <section className="border-b border-[#E2DAC9] bg-[#FBF9F3]">
      <div className="mx-auto max-w-4xl px-5 py-20 sm:py-24">
        <p className={`text-[28px] font-medium leading-[1.25] tracking-[-0.015em] sm:text-[38px] ${serif}`}>
          When every filing, exhibit and citation is verified and in place,
          deciding becomes straightforward. Sutra maintains the complete thread
          from first filing to final order.
        </p>
      </div>
    </section>
  );
}

function WorkingRecord() {
  const rows = [
    {
      n: "01",
      title: "Filing",
      body: "Upload pleadings, notices and submissions. The system structures incoming documents into an indexed, chronological docket.",
      meta: "Docket & Records",
    },
    {
      n: "02",
      title: "Evidence",
      body: "Annexes, exhibits and affidavits are indexed and cross-referenced, making every cited document accessible in context.",
      meta: "Annexes & Index",
    },
    {
      n: "03",
      title: "Reasoning",
      body: "Draft findings, bench memos and settlement frameworks drawn directly from verified record citations, section by section.",
      meta: "Memo & Findings",
    },
    {
      n: "04",
      title: "Order",
      body: "Finalize reasoned orders or settlement terms with a complete audit trail, ready for official sign-off or distribution.",
      meta: "Signed & Issued",
    },
  ];

  return (
    <section id="working-record" className="border-b border-[#E2DAC9]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <h2 className={`text-[34px] font-semibold tracking-[-0.015em] sm:text-[40px] ${serif}`}>
          The working record
        </h2>
        <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-[#4A4238]">
          One structured case file, organized stage by stage. Each phase settles
          before the next begins, so nothing is lost, overlooked or out of order.
        </p>

        <div className="mt-12">
          {rows.map((r) => (
            <div
              key={r.n}
              className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-t border-[#E2DAC9] py-6 last:border-b sm:gap-6"
            >
              <span className={`w-9 shrink-0 whitespace-nowrap text-[15px] font-semibold text-[#1F3A2F] ${sans}`}>
                {r.n}
              </span>
              <div>
                <h3 className={`text-[21px] font-semibold tracking-[-0.01em] ${serif}`}>{r.title}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-[#4A4238]">{r.body}</p>
              </div>
              <span className="hidden shrink-0 whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.08em] text-[#4A4238] sm:inline">
                {r.meta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E2DAC9] bg-[#F5F1E9] py-12 text-[#4A4238]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo className="h-6 w-auto" />
          <span className="text-[13px] font-medium text-[#4A4238]">Legal Intelligence Workspace</span>
        </div>
        <div className="flex items-center gap-6 text-[14px]">
          <Link href="/login" className="hover:text-[#1B1611] transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-[#1B1611] transition-colors">
            Get started
          </Link>
          <a href="#working-record" className="hover:text-[#1B1611] transition-colors">
            The record
          </a>
        </div>
        <p className="text-[12.5px] text-[#4A4238]">
          &copy; {new Date().getFullYear()} Sutra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
