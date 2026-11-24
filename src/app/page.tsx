import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  FileText,
  Gavel,
  Inbox,
  Landmark,
  PenLine,
  Scale,
  Search,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sutra · For judges & mediators",
  description:
    "Turn case files into structured drafts and review records, ready for judge and mediator sign-off.",
};

const NAVY = "#0c3c60";
const INK = "#072136";
const BLUEPRINT = "#d8e8f2";
const LIGHT = "#eef3f8";

const display = "font-[var(--font-brico)]";
const body = "font-[var(--font-intertight)]";

const btnPrimary =
  "inline-flex items-center gap-2 bg-[#0c3c60] px-6 py-3 text-[15px] font-semibold text-white shadow-[4px_4px_0_rgba(7,33,54,0.9)] transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 active:translate-y-0 active:translate-x-0";

const btnSecondary =
  "inline-flex items-center gap-2 border border-[#0c3c60]/25 px-6 py-3 text-[15px] font-semibold text-[#072136] hover:border-[#0c3c60]/50 transition-colors";

export default function Home() {
  return (
    <main className={`min-h-screen bg-white text-[#072136] overflow-x-clip ${body}`}>
      {/* ------- Nav ------- */}
      <header className="sticky top-0 z-30 border-b border-[#d8e8f2] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5" aria-label="Sutra home">
            <span className="flex h-7 w-7 items-center justify-center bg-[#0c3c60]">
              <Scale className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
            <span className={`text-[15px] font-bold tracking-[-0.01em] ${display}`}>Sutra</span>
          </a>
          <nav className="flex items-center gap-5" aria-label="Primary">
            <Link href="/login" className="text-[15px] font-medium text-[#072136]/70 hover:text-[#072136] transition-colors">
              Sign in
            </Link>
            <Link href="/register" className={btnPrimary}>
              Get started
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </nav>
        </div>
      </header>

      {/* ------- Hero ------- */}
      <section className="relative overflow-hidden">
        <BlueprintGrid />
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 border border-[#0c3c60]/15 bg-[#eef3f8] px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#0c3c60]">
              <Gavel className="h-3.5 w-3.5" strokeWidth={2.2} />
              For judges & mediators
            </p>
            <h1 className={`mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[60px] ${display}`}>
              A clear draft, from a messy case file
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#072136]/70">
              Sutra turns your uploaded documents into structured drafts and review records,
              built for the way judges and mediators actually work.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className={`${btnPrimary} w-full sm:w-auto`}>
                Start free trial
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </Link>
              <a href="#how" className={`${btnSecondary} w-full justify-center sm:w-auto`}>
                See how it works
              </a>
            </div>
          </div>

          <div className="mt-14 sm:mt-16">
            <HeroCase />
          </div>
        </div>
      </section>

      {/* ------- Pillars ------- */}
      <section className="border-t border-[#d8e8f2] bg-[#eef3f8]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="max-w-2xl">
            <h2 className={`text-[32px] font-bold tracking-[-0.02em] sm:text-[38px] ${display}`}>
              The work, done properly
            </h2>
            <p className="mt-4 text-[16px] text-[#072136]/65">
              Three disciplines, one workspace. Record, prepare and settle with a clear chain of record.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Pillar
              n="01"
              icon={<FileText className="h-5 w-5" strokeWidth={2} />}
              title="Record"
              body="Collate filings, evidence and submissions into a single, ordered case file."
            />
            <Pillar
              n="02"
              icon={<PenLine className="h-5 w-5" strokeWidth={2} />}
              title="Prepare"
              body="Draft findings, memos and settlement terms from the record, section by section."
            />
            <Pillar
              n="03"
              icon={<Landmark className="h-5 w-5" strokeWidth={2} />}
              title="Settle"
              body="Pass the draft through judge and mediator review, then finalize the order."
            />
          </div>
        </div>
      </section>

      {/* ------- Workflow ------- */}
      <section id="how" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="max-w-2xl">
            <h2 className={`text-[32px] font-bold tracking-[-0.02em] sm:text-[38px] ${display}`}>
              Four steps, one thread
            </h2>
            <p className="mt-4 text-[16px] text-[#072136]/65">
              The next stage opens only when the one before it is settled.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-4">
            <FlowStep icon={<Inbox className="h-5 w-5" strokeWidth={2} />} n="01" title="Intake" body="Upload the case record and key documents." />
            <FlowStep icon={<Search className="h-5 w-5" strokeWidth={2} />} n="02" title="Analyse" body="The system surfaces issues and suggests a draft." />
            <FlowStep icon={<Gavel className="h-5 w-5" strokeWidth={2} />} n="03" title="Appraise" body="Judge and mediator review leaves a clear record." />
            <FlowStep icon={<PenLine className="h-5 w-5" strokeWidth={2} />} n="04" title="Order" body="Finalize and export the order or settlement." />
          </div>
        </div>
      </section>

      {/* ------- Closing band ------- */}
      <section className="bg-[#0c3c60]">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
          <h2 className={`text-[32px] font-bold tracking-[-0.02em] text-white sm:text-[40px] ${display}`}>
            A case worth deciding starts with a clear draft
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] text-white/65">
            Set up the workspace in minutes and run the first matter end to end.
          </p>
          <Link href="/register" className={`${btnPrimary} mt-8 bg-white text-[#0c3c60] shadow-[4px_4px_0_rgba(255,255,255,0.6)]`}>
            Start free trial
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* ------- Footer ------- */}
      <footer className="bg-[#072136]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 border-t border-white/10 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center bg-white">
              <Scale className="h-3.5 w-3.5" style={{ color: INK }} strokeWidth={2.2} />
            </span>
            <span className={`text-[14px] font-bold text-white ${display}`}>Sutra</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-white/55">
            <a href="/login" className="hover:text-white transition-colors">Sign in</a>
            <a href="/register" className="hover:text-white transition-colors">Start free trial</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
          </div>
          <p className="text-[13px] text-white/40">© 2026 Sutra</p>
        </div>
      </footer>
    </main>
  );
}

/* ---------------- Hero case visual ---------------- */

function HeroCase() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
        {/* Case file */}
        <div className="border-2 border-[#0c3c60] bg-white shadow-[8px_8px_0_rgba(12,60,96,0.9)]">
          <div className="flex items-center justify-between border-b-2 border-[#0c3c60] bg-[#eef3f8] px-5 py-3">
            <span className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${display}`}>
              Mediation brief
            </span>
            <span className="border border-[#0c3c60] px-2 py-0.5 text-[12px] font-medium text-[#0c3c60]">
              Case 1841
            </span>
          </div>
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-16 bg-[#0c3c60]" />
              <span className="h-2 w-24 bg-[#d8e8f2]" />
            </div>
            <div className="space-y-1.5 pl-6">
              <div className="h-1.5 w-4/5 bg-[#d8e8f2]" />
              <div className="h-1.5 w-3/5 bg-[#d8e8f2]" />
              <div className="h-1.5 w-2/3 bg-[#d8e8f2]" />
            </div>
            <div className="flex items-center gap-4 border-t border-[#d8e8f2] pt-3 text-[12px] text-[#072136]/60">
              <span>Parties · 2</span>
              <span>Clauses · 6</span>
              <span>Annexes · 3</span>
            </div>
          </div>
        </div>

        {/* Resolution stamp */}
        <div className="flex flex-col justify-between border-2 border-[#0c3c60] bg-[#0c3c60] p-5 text-white shadow-[8px_8px_0_rgba(7,33,54,0.85)]">
          <div>
            <span className={`text-[13px] font-semibold uppercase tracking-[0.1em] text-[#bed0dc] ${display}`}>
              Resolution
            </span>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center bg-white">
                <Check className="h-4 w-4" style={{ color: INK }} strokeWidth={3} />
              </span>
              <div>
                <p className="text-[15px] font-semibold">Draft accepted</p>
                <p className="text-[12px] text-white/60">Review complete · signed off</p>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-white/15 pt-3">
            <p className="text-[12px] text-white/50">Prepared by Sutra · v3</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

function BlueprintGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "linear-gradient(to right, #0c3c60 1px, transparent 1px), linear-gradient(to bottom, #0c3c60 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)",
      }}
    />
  );
}

function Pillar({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group border-2 border-[#0c3c60] bg-white p-6 shadow-[6px_6px_0_rgba(12,60,96,0.25)] transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center bg-[#0c3c60] text-white">
          {icon}
        </span>
        <span className={`text-[13px] font-semibold text-[#0c3c60]/50 ${display}`}>{n}</span>
      </div>
      <h3 className={`mt-5 text-[20px] font-bold tracking-[-0.01em] ${display}`}>{title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#072136]/65">{body}</p>
    </div>
  );
}

function FlowStep({ icon, n, title, body }: { icon: React.ReactNode; n: string; title: string; body: string }) {
  return (
    <div className="border border-[#d8e8f2] bg-[#eef3f8] p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center bg-white border border-[#d8e8f2] text-[#0c3c60]">
          {icon}
        </span>
        <span className={`text-[14px] font-semibold text-[#0c3c60]/50 ${display}`}>{n}</span>
      </div>
      <h3 className={`mt-4 text-[17px] font-bold ${display}`}>{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[#072136]/60">{body}</p>
    </div>
  );
}
