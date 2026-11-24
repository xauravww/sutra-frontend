import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  FileText,
  Gavel,
  Inbox,
  PenLine,
  Scale,
  Search,
} from "lucide-react";
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
        <PillarsSection />
        <WorkingRecord />
        <WorkflowSection />
        <ClosingBand />
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
          <h1 className={`text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] sm:text-[66px] ${serif}`}>
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

function PillarsSection() {
  const pillars = [
    {
      n: "01",
      icon: <FileText className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      title: "Record",
      body: "Collate filings, evidence and submissions into a single, ordered case file with full source provenance.",
    },
    {
      n: "02",
      icon: <PenLine className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      title: "Prepare",
      body: "Draft findings, memos and settlement terms from the record, linked section by section to verified exhibits.",
    },
    {
      n: "03",
      icon: <Gavel className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      title: "Settle",
      body: "Pass drafts through judge and mediator review with complete audit trails before issuing final orders.",
    },
  ];

  return (
    <section className="border-b border-[#E2DAC9] bg-[#F5F1E9]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <div className="max-w-2xl">
          <h2 className={`text-[32px] font-semibold tracking-[-0.015em] sm:text-[38px] ${serif}`}>
            The work, done with precision
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#4A4238]">
            Three connected stages to review, prepare and settle with a clear chain of record.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.n}
              className="border border-[#E2DAC9] bg-[#FBF9F3] p-7 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center border border-[#1F3A2F]/20 bg-[#F5F1E9]">
                  {p.icon}
                </span>
                <span className={`text-[13px] font-semibold text-[#1F3A2F] ${sans}`}>{p.n}</span>
              </div>
              <h3 className={`mt-6 text-[22px] font-semibold tracking-[-0.01em] ${serif}`}>{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4A4238]">{p.body}</p>
            </div>
          ))}
        </div>
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

function WorkflowSection() {
  const steps = [
    {
      icon: <Inbox className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      n: "01",
      title: "Intake",
      body: "Upload pleadings, annexes and court notices directly into the docket.",
    },
    {
      icon: <Search className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      n: "02",
      title: "Analyze",
      body: "The analysis pipeline extracts timeline events and cross-references exhibits.",
    },
    {
      icon: <Gavel className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      n: "03",
      title: "Appraise",
      body: "Judge and mediator review proceeds with line-item citations to evidence.",
    },
    {
      icon: <PenLine className="h-5 w-5 text-[#1F3A2F]" strokeWidth={2} />,
      n: "04",
      title: "Order",
      body: "Finalize reasoned orders or settlement terms with verified signatures.",
    },
  ];

  return (
    <section id="workflow" className="border-b border-[#E2DAC9] bg-[#FBF9F3]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <div className="max-w-2xl">
          <h2 className={`text-[32px] font-semibold tracking-[-0.015em] sm:text-[38px] ${serif}`}>
            Four stages, one verified record
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#4A4238]">
            Each stage unlocks when the previous stage is settled, maintaining evidentiary integrity.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="border border-[#E2DAC9] bg-[#F5F1E9] p-6 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center border border-[#1F3A2F]/20 bg-white">
                  {s.icon}
                </span>
                <span className={`text-[13px] font-semibold text-[#1F3A2F] ${sans}`}>{s.n}</span>
              </div>
              <h3 className={`mt-5 text-[19px] font-semibold tracking-[-0.01em] ${serif}`}>{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#4A4238]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  return (
    <section className="bg-[#1F3A2F] text-white">
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
            className="inline-flex items-center gap-2 bg-[#F5F1E9] px-7 py-3.5 text-[15px] font-medium text-[#1B1611] transition-opacity hover:opacity-90"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
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
          <a href="#workflow" className="hover:text-[#1B1611] transition-colors">
            Workflow
          </a>
        </div>
        <p className="text-[12.5px] text-[#4A4238]">
          &copy; {new Date().getFullYear()} Sutra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
