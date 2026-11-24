import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpFromLine,
  Bot,
  Check,
  FileText,
  ListChecks,
  PenLine,
  Scale,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sutra · Legal Intelligence Workspace",
  description:
    "Turn case documents into structured drafts, reviews and decisions, auditable end to end.",
};

const COBALT = "#2f5bff";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#e9eaee] text-[#161616] font-[var(--font-inter)]">
      {/* ------- Nav ------- */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#e9eaee]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5" aria-label="Sutra home">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#161616]">
              <Scale className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
            </span>
            <span className="font-[var(--font-sora)] text-[15px] font-bold tracking-[-0.01em]">
              Sutra
            </span>
          </a>
          <nav className="flex items-center gap-5" aria-label="Primary">
            <Link href="/login" className="text-[15px] font-medium text-[#161616]/70 hover:text-[#161616] transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="land-btn inline-flex items-center gap-1.5 rounded-full bg-[#2f5bff] px-5 py-2 text-[15px] font-semibold text-white"
              style={{ boxShadow: "0 6px 18px rgba(47,91,255,.28)" }}
            >
              Get started
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </nav>
        </div>
      </header>

      {/* ------- Hero (screen 1) ------- */}
      <section className="land-ground relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="land-enter inline-flex items-center rounded-full bg-white/80 px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#161616]/55 ring-1 ring-black/5">
              Sutra · For judges & mediators
            </p>
            <h1 className="land-enter land-enter-d1 mt-6 font-[var(--font-sora)] text-[46px] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-[64px]">
              From case files to a clear resolution
            </h1>
            <p className="land-enter land-enter-d2 mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#161616]/80">
              Sutra turns your uploaded documents into structured drafts and review records,
              ready for judge and mediator sign-off.
            </p>
            <div className="land-enter land-enter-d3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="land-btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2f5bff] px-7 py-3.5 text-[15px] font-semibold text-white sm:w-auto"
                style={{ boxShadow: "0 6px 18px rgba(47,91,255,.28)" }}
              >
                Start free trial
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </Link>
              <a
                href="#how"
                className="land-btn inline-flex w-full items-center justify-center rounded-full border border-black/15 px-7 py-3.5 text-[15px] font-semibold text-[#161616] hover:border-black/30 sm:w-auto"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="land-enter land-enter-d4 mt-14 sm:mt-16">
            <HeroFrame />
          </div>
        </div>
      </section>

      {/* ------- Features ------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="font-[var(--font-sora)] text-[30px] font-bold tracking-[-0.02em] sm:text-[34px]">
                One workspace for the whole case
              </h2>
            </div>
            <p className="max-w-sm text-[15px] text-[#161616]/65">
              Draft, review and finalize in a single thread, with every action recorded.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <FeatureCard
              title="Draft with the engine"
              body="Describe the dispute and the system drafts the document, formatted to the format your court or mediation session expects."
              visual={<DraftVisual />}
            />
            <FeatureCard
              title="Structured review"
              body="Judge and mediator stages each capture a clear sign-off before anything moves on."
              visual={<ReviewVisual />}
            />
            <FeatureCard
              title="Audit-ready"
              body="Every change is logged and traceable, and the final record exports clean."
              visual={<AuditVisual />}
            />
          </div>
        </div>
      </section>

      {/* ------- Workflow (screen) ------- */}
      <section id="how" className="bg-[#f4f5f7]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-[var(--font-sora)] text-[30px] font-bold tracking-[-0.02em] sm:text-[34px]">
              From upload to final order
            </h2>
            <p className="mt-4 text-[16px] text-[#161616]/65">
              Four steps, one thread. The next stage appears only when the previous one is settled.
            </p>
          </div>

          <div className="mt-14">
            <Workflow />
          </div>
        </div>
      </section>

      {/* ------- Closing band ------- */}
      <section className="bg-[#161616]">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
          <h2 className="font-[var(--font-sora)] text-[30px] font-bold tracking-[-0.02em] text-white sm:text-[36px]">
            Your next case starts with a clear draft
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] text-white/60">
            Set up the workspace in minutes and run the first case end to end.
          </p>
          <Link
            href="/register"
            className="land-btn mt-8 inline-flex items-center gap-2 rounded-full bg-[#2f5bff] px-7 py-3.5 text-[15px] font-semibold text-white"
            style={{ boxShadow: "0 6px 18px rgba(47,91,255,.35)" }}
          >
            Start free trial
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* ------- Footer ------- */}
      <footer className="bg-[#161616]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 border-t border-white/10 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-white/10">
              <Scale className="h-3 w-3 text-white" strokeWidth={2.2} />
            </span>
            <span className="font-[var(--font-sora)] text-[14px] font-bold text-white">
              Sutra
            </span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-white/50">
            <a href="/login" className="hover:text-white/90 transition-colors">Sign in</a>
            <a href="/register" className="hover:text-white/90 transition-colors">Start free trial</a>
            <a href="#how" className="hover:text-white/90 transition-colors">How it works</a>
          </div>
          <p className="text-[13px] text-white/40">
            © 2026 Sutra
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ---------------- Hero product frame ---------------- */

function HeroFrame() {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-[20px] bg-white shadow-[0_60px_120px_-50px_rgba(22,22,22,0.45)] ring-1 ring-black/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-black/5 bg-[#fafafb] px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/70" />
        <div className="ml-3 flex h-6 flex-1 items-center px-3 text-[12px] text-[#161616]/45 rounded-full bg-[#f4f5f7] ring-1 ring-black/5">
          app.sutra.example/cases/1841
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[210px_1fr]">
        {/* Document rail */}
        <div className="hidden border-r border-black/5 bg-[#f4f5f7] p-4 sm:block">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#161616]/45">
            Case 1841
          </p>
          <div className="mt-3 space-y-1">
            <DocRow icon title="Show cause notice" meta="PDF · 2.1 MB" active />
            <DocRow icon title="Reply to notice" meta="PDF · 840 KB" />
            <DocRow icon title="Witness list" meta="PDF · 310 KB" />
            <DocRow icon title="Inquiry report" meta="PDF · 1.6 MB" />
          </div>
          <div className="mt-5 rounded-[12px] bg-[#2f5bff]/10 p-3.5 ring-1 ring-[#2f5bff]/15">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" style={{ color: COBALT }} />
              <span className="text-[13px] font-semibold">System draft</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#161616]/60">
              Generated from 4 source documents
            </p>
          </div>
        </div>

        {/* Main workspace */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-[#161616]/55">Case 1841</p>
              <h3 className="font-[var(--font-sora)] text-[19px] font-bold tracking-[-0.01em]">
                Mediation brief
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2f5bff]/10 px-3 py-1.5 text-[12px] font-semibold" style={{ color: COBALT }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#2f5bff]" />
              Awaiting judge review
            </span>
          </div>

          <div className="mt-4 flex gap-5 border-b border-black/5 text-[14px] font-medium">
            <span className="-mb-px border-b-2 pb-2" style={{ borderColor: COBALT, color: "#161616" }}>
              System draft
            </span>
            <span className="pb-2 text-[#161616]/50">Documents</span>
            <span className="pb-2 text-[#161616]/50">Review</span>
          </div>

          <div className="mt-4 rounded-[14px] border border-black/5 bg-[#fafafb] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#161616]/55">Draft v3</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-black/10 px-3 py-1 text-[12px] font-medium text-[#161616]">
                  Regenerate
                </span>
                <span className="rounded-full bg-[#2f5bff] px-3 py-1 text-[12px] font-semibold text-white">
                  Accept draft
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-[#161616]/75">
              <p>
                The respondent was not afforded an opportunity to reply to the
                <span className="rounded bg-[#2f5bff]/10 px-1 font-medium" style={{ color: "#161616" }}>
                  {" "}show cause notice{" "}
                </span>
                before the inquiry concluded.
              </p>
              <p>This omission should be recorded and addressed before finalization.</p>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-[#161616]/8" />
              <div className="h-2 w-5/6 rounded-full bg-[#161616]/8" />
              <div className="h-2 w-2/3 rounded-full bg-[#161616]/8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocRow({
  icon,
  title,
  meta,
  active = false,
}: {
  icon?: React.ReactNode;
  title: string;
  meta: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${
        active ? "bg-white shadow-sm ring-1 ring-black/5" : ""
      }`}
    >
      <FileText className="h-4 w-4 shrink-0 text-[#161616]/40" strokeWidth={1.8} />
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-[#161616]">{title}</p>
        <p className="text-[11px] text-[#161616]/45">{meta}</p>
      </div>
    </div>
  );
}

/* ---------------- Feature mini-visuals ---------------- */

function FeatureCard({
  title,
  body,
  visual,
}: {
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="land-card flex flex-col rounded-[18px] bg-white p-5 shadow-[0_24px_48px_-32px_rgba(22,22,22,.32)] ring-1 ring-black/5">
      <div className="rounded-[14px] bg-[#f4f5f7] p-4 ring-1 ring-black/5">{visual}</div>
      <h3 className="mt-5 font-[var(--font-sora)] text-[19px] font-bold tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#161616]/65">{body}</p>
    </div>
  );
}

function DraftVisual() {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-[10px] border border-black/10 bg-white px-3 py-2.5">
        <Bot className="h-5 w-5" style={{ color: COBALT }} />
        <span className="flex-1 text-[13px] text-[#161616]/50">Generate opening statement</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f5bff]">
          <ArrowRight className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2 w-11/12 rounded-full bg-[#161616]/8" />
        <div className="h-2 w-full rounded-full bg-[#161616]/8" />
        <div className="h-2 w-4/5 rounded-full bg-[#161616]/10" />
        <div className="h-2 w-3/5 rounded-full bg-[#2f5bff]/25" />
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#2f5bff] px-3 py-1.5 text-[12px] font-semibold text-white">
        Draft
        <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
      </div>
    </div>
  );
}

function ReviewVisual() {
  const steps = [
    { label: "Mediator review", state: "done" },
    { label: "Judge review", state: "current" },
    { label: "Final order", state: "todo" },
  ];
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2.5">
          {s.state === "done" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f5bff]">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
          ) : s.state === "current" ? (
            <span className="h-5 w-5 rounded-full border-2 border-[#2f5bff]" />
          ) : (
            <span className="h-5 w-5 rounded-full border-2 border-black/15" />
          )}
          <span className={`text-[13px] ${s.state === "todo" ? "text-[#161616]/45" : "font-medium text-[#161616]"}`}>
            {s.label}
          </span>
          <div className="ml-auto h-1.5 flex-1 rounded-full bg-black/8">
            <div
              className="h-1.5 rounded-full"
              style={{ width: s.state === "done" ? "100%" : s.state === "current" ? "45%" : "0%", background: COBALT }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditVisual() {
  const log = [
    { t: "09:41", a: "Draft v3 generated" },
    { t: "09:42", a: "Draft v3 saved" },
    { t: "10:05", a: "Judge review started" },
    { t: "10:12", a: "Change logged by judiciary" },
  ];
  return (
    <div>
      <div className="space-y-2.5">
        {log.map((row, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COBALT }} />
            <span className="text-[11.5px] tabular-nums text-[#161616]/45">{row.t}</span>
            <span className="truncate text-[12.5px] text-[#161616]/75">{row.a}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-semibold text-[#161616]">
        <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
        Export record
      </div>
    </div>
  );
}

/* ---------------- Workflow ---------------- */

function Workflow() {
  const steps = [
    { icon: <ArrowUpFromLine className="h-7 w-7" strokeWidth={2.2} />, n: "01", title: "Upload", body: "Documents, orders and evidence in one case folder." },
    { icon: <Bot className="h-7 w-7" strokeWidth={2.2} />, n: "02", title: "Analyze", body: "The system surfaces issues and suggests a draft." },
    { icon: <ListChecks className="h-7 w-7" strokeWidth={2.2} />, n: "03", title: "Review", body: "Judge and mediator review leaves a clear record." },
    { icon: <PenLine className="h-7 w-7" strokeWidth={2.2} />, n: "04", title: "Finalize", body: "Export the final order once every stage is signed." },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-4 lg:gap-0">
      {steps.map((s, i) => (
        <StepRow key={i} step={s} index={i} isLast={i === steps.length - 1} />
      ))}
    </div>
  );
}

function StepRow({ step, index, isLast }: { step: any; index: number; isLast: boolean }) {
  const shift = `${22 + index * 8}px`;
  return (
    <div className="flex flex-1 flex-col lg:px-4">
      <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-[16px] bg-white shadow-sm ring-1 ring-black/10 ${index === 0 ? "ring-transparent" : ""}`}
          style={index === 0 ? { color: "#fff", background: COBALT } : { color: "#161616" }}
        >
          {step.icon}
        </div>
        {!isLast && (
          <div className="flow-line flex-1 lg:hidden" style={{ ["--flow-shift" as any]: shift }} />
        )}
      </div>
      <div className="mt-4 flex items-start gap-3 lg:mt-5 lg:block">
        <span className="font-[var(--font-sora)] text-[13px] font-bold" style={{ color: COBALT }}>
          {step.n}
        </span>
        <div className="lg:mt-1">
          <h3 className="font-[var(--font-sora)] text-[17px] font-bold">{step.title}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#161616]/60">{step.body}</p>
        </div>
      </div>
    </div>
  );
}
