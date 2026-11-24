"use client";

import { useState } from "react";
import { CheckCircle2, FileCheck2, Scale, Users, ShieldCheck } from "lucide-react";

type RoleMode = "judge" | "mediator";

interface StepItem {
  step: string;
  title: string;
  description: string;
}

const JUDGE_STEPS: StepItem[] = [
  {
    step: "01",
    title: "Upload the case record",
    description: "Drop in the charge sheet, witness statements, and applications. Everything is organized into a clean date-sorted docket.",
  },
  {
    step: "02",
    title: "Verify claims against evidence",
    description: "Every statement links directly to its source exhibit. Click any point to view the exact page in context.",
  },
  {
    step: "03",
    title: "Prepare bench memos",
    description: "Review structured summaries with page citations comparing opposing arguments side by side.",
  },
  {
    step: "04",
    title: "Issue final orders",
    description: "Export clean judicial orders with a complete audit record, ready for official sign-off.",
  },
];

const MEDIATOR_STEPS: StepItem[] = [
  {
    step: "01",
    title: "Gather submissions from both sides",
    description: "Upload party claims, counter-claims, statements, and contracts into one private workspace.",
  },
  {
    step: "02",
    title: "Identify shared ground",
    description: "Compare filings side by side to surface where parties already agree and where gaps remain.",
  },
  {
    step: "03",
    title: "Track discussion notes",
    description: "Record session takeaways, caucus points, and agreed items in an organized meeting ledger.",
  },
  {
    step: "04",
    title: "Draft settlement agreements",
    description: "Generate clear settlement terms with all agreed points in plain language, ready for mutual sign-off.",
  },
];

export default function CaseHandlingSection() {
  const [role, setRole] = useState<RoleMode>("judge");

  const steps = role === "judge" ? JUDGE_STEPS : MEDIATOR_STEPS;

  return (
    <section id="how-cases-are-handled" className="border-b border-sutra-line bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        {/* Header with Title and Premium Role Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-[30px] font-semibold tracking-[-0.015em] text-sutra-ink sm:text-[38px] font-serif">
              How cases are handled
            </h2>
            <p className="mt-2.5 text-[16px] leading-relaxed text-sutra-ink-2">
              Select your role to see how cases move from initial filing to final resolution.
            </p>
          </div>

          {/* Premium Segmented Switcher */}
          <div className="inline-flex self-start md:self-auto p-1.5 bg-[#F0F2F6] border border-sutra-line rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setRole("judge")}
              className={`relative cursor-pointer flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] font-medium transition-all duration-200 rounded-lg select-none ${
                role === "judge"
                  ? "bg-navy text-white font-semibold shadow-sm"
                  : "text-sutra-ink-2 hover:text-sutra-ink hover:bg-white/60"
              }`}
              aria-pressed={role === "judge"}
            >
              <Scale className={`h-4 w-4 transition-colors ${role === "judge" ? "text-white" : "text-sutra-ink-3"}`} />
              <span>For Judges</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("mediator")}
              className={`relative cursor-pointer flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] font-medium transition-all duration-200 rounded-lg select-none ${
                role === "mediator"
                  ? "bg-navy text-white font-semibold shadow-sm"
                  : "text-sutra-ink-2 hover:text-sutra-ink hover:bg-white/60"
              }`}
              aria-pressed={role === "mediator"}
            >
              <Users className={`h-4 w-4 transition-colors ${role === "mediator" ? "text-white" : "text-sutra-ink-3"}`} />
              <span>For Mediators</span>
            </button>
          </div>
        </div>

        {/* 2-Column Balanced Layout */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Column: Clean, Light, Uncramped Step Cards (7 cols) */}
          <div className="flex flex-col border border-sutra-line bg-white lg:col-span-7">
            {steps.map((s, index) => (
              <div
                key={`${role}-${s.step}`}
                className={`p-6 sm:p-7 transition-colors hover:bg-tint/30 ${
                  index !== steps.length - 1 ? "border-b border-sutra-line" : ""
                }`}
              >
                {/* Step indicator on top */}
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold tracking-[0.06em] text-navy font-inter">
                    STEP {s.step}
                  </span>
                  <span className="text-sutra-line">/</span>
                  <span className="text-[11.5px] font-medium text-sutra-ink-3 uppercase tracking-wider">
                    {role === "judge" ? "Adjudication" : "Resolution"}
                  </span>
                </div>

                {/* Clear, breathable title */}
                <h3 className="mt-2 text-[18px] sm:text-[19px] font-semibold text-sutra-ink font-serif leading-snug">
                  {s.title}
                </h3>

                {/* Uncramped, relaxed description */}
                <p className="mt-2 text-[14.5px] leading-relaxed text-sutra-ink-2">
                  {s.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Clean Case Summary Panel (5 cols) */}
          <div className="flex flex-col justify-between border border-sutra-line bg-white p-6 sm:p-7 lg:col-span-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-sutra-line pb-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4.5 w-4.5 text-navy" />
                  <span className="text-[12.5px] font-semibold tracking-[0.05em] uppercase text-navy">
                    {role === "judge" ? "Bench Matter Preview" : "Mediation Session Preview"}
                  </span>
                </div>
                <span className="border border-green-ink/30 bg-green-bg px-2.5 py-1 text-[11px] font-medium text-green-ink">
                  {role === "judge" ? "Court Ready" : "In Session"}
                </span>
              </div>

              {role === "judge" ? (
                <div className="mt-5 space-y-4">
                  <div className="bg-sutra-bg/70 p-4.5 border border-sutra-line/80">
                    <p className="text-[11.5px] font-medium text-sutra-ink-3">
                      Commercial Bench Matter
                    </p>
                    <p className="mt-1 text-[16px] font-semibold text-sutra-ink font-serif">
                      State vs. Sharma &middot; Suit 204/2026
                    </p>
                  </div>

                  <div className="space-y-3 pt-1 text-[13.5px]">
                    <div className="flex items-center justify-between py-1.5 border-b border-sutra-line/60">
                      <span className="text-sutra-ink-3">Filings indexed</span>
                      <span className="font-semibold text-sutra-ink">Pleadings, Charge Sheet</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-sutra-line/60">
                      <span className="text-sutra-ink-3">Exhibits verified</span>
                      <span className="font-semibold text-sutra-ink">14 attachments</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-sutra-line/60">
                      <span className="text-sutra-ink-3">Cross-references</span>
                      <span className="font-semibold text-navy">All claims linked</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sutra-ink-3">Status</span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-green-ink">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready for final order
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="bg-sutra-bg/70 p-4.5 border border-sutra-line/80">
                    <p className="text-[11.5px] font-medium text-sutra-ink-3">
                      Commercial Dispute Mediation
                    </p>
                    <p className="mt-1 text-[16px] font-semibold text-sutra-ink font-serif">
                      Apex Logistics Ltd vs. Vertex Shipping
                    </p>
                  </div>

                  <div className="space-y-3 pt-1 text-[13.5px]">
                    <div className="flex items-center justify-between py-1.5 border-b border-sutra-line/60">
                      <span className="text-sutra-ink-3">Party submissions</span>
                      <span className="font-semibold text-sutra-ink">Both statements filed</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-sutra-line/60">
                      <span className="text-sutra-ink-3">Agreed terms</span>
                      <span className="font-semibold text-sutra-ink">3 common points</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-sutra-line/60">
                      <span className="text-sutra-ink-3">Open items</span>
                      <span className="font-semibold text-navy">2 clauses in discussion</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sutra-ink-3">Status</span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-green-ink">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Drafting settlement
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-sutra-line pt-3.5">
              <div className="flex items-center gap-2 text-[12px] text-sutra-ink-3">
                <ShieldCheck className="h-4 w-4 text-navy shrink-0" />
                <span>
                  {role === "judge"
                    ? "Verified under judicial review standards"
                    : "Protected under strict mediation confidentiality"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
