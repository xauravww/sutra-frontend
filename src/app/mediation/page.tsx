"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { mediation, type MediationSession } from "@/lib/api";

export default function MediationDirectoryPage() {
  const [sessions, setSessions] = useState<MediationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    mediation
      .list()
      .then((res) => setSessions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.party_a_name.toLowerCase().includes(q) ||
      s.party_b_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="max-w-[940px] mx-auto px-6 py-8 pb-21">
        {/* Page header */}
        <div className="flex items-end justify-between gap-6 flex-wrap mb-7">
          <div>
            <h1 className="text-[33px] font-bold tracking-tight leading-[1.12]">
              Mediation Sessions
            </h1>
            <p className="mt-1.5 text-[16px] text-sutra-ink-3">
              Indian Mediation Act, 2023
            </p>
          </div>
          <button className="inline-flex items-center gap-2.5 bg-navy text-white border-0 rounded-xl text-[17px] font-semibold px-6 py-3.5 min-h-[52px] transition-colors hover:bg-navy-dark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="w-[22px] h-[22px]"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Session
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-3.5 flex-wrap items-center mb-6">
          <label className="flex-1 min-w-[360px] flex items-center gap-3 bg-white border border-sutra-line rounded-xl px-4 min-h-[56px] transition-all focus-within:border-focus focus-within:shadow-[0_0_0_3px_rgba(58,124,192,.15)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="w-[22px] h-[22px] text-sutra-ink-3 flex-none"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, case number, or party name"
              className="border-0 bg-transparent outline-none w-full font-[inherit] text-[17px] text-sutra-ink placeholder:text-sutra-ink-3"
            />
          </label>
          <div className="flex items-center gap-2.5 bg-white border border-sutra-line rounded-xl px-[18px] min-h-[56px] text-[16px] font-semibold text-sutra-ink-2">
            All statuses
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-[18px] h-[18px]"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <span className="text-[16px] text-sutra-ink-3 whitespace-nowrap">
            <b className="text-sutra-ink font-bold">{filtered.length}</b>{" "}
            sessions
          </span>
        </div>

        {/* Case list */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="bg-white border border-sutra-line rounded-2xl p-8 text-center text-sutra-ink-3">
              Loading sessions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-sutra-line rounded-2xl p-8 text-center text-sutra-ink-3">
              No sessions found.
            </div>
          ) : (
            filtered.map((s) => (
              <article
                key={s.id}
                className="relative bg-white border border-sutra-line rounded-2xl p-[26px_28px_24px] overflow-hidden transition-colors hover:border-[#C7D0DC] group"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-navy transform scale-y-0 origin-top transition-transform group-hover:scale-y-100" />

                <div className="flex items-center justify-between gap-3.5 mb-3.5">
                  <span className="text-[15px] font-bold text-navy tracking-wider bg-tint border border-tint-2 py-1.5 px-3.5 rounded-[9px]">
                    MED-{String(s.id).padStart(4, "0")}
                  </span>
                  <StatusBadge status={s.status} />
                </div>

                <h2 className="text-[22px] font-bold leading-snug tracking-tight mb-4">
                  {s.title}
                </h2>

                {/* Parties */}
                <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl px-5 mb-5">
                  <div className="flex items-center gap-3.5 py-3.5 border-b border-sutra-line-2 last:border-b-0">
                    <span className="flex-none inline-flex items-center justify-center min-w-[70px] h-7 px-3 text-[13px] font-bold text-navy uppercase tracking-widest bg-tint border border-tint-2 rounded-[7px]">
                      Party A
                    </span>
                    <span className="text-[17px] font-semibold text-sutra-ink">
                      {s.party_a_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 py-3.5">
                    <span className="flex-none inline-flex items-center justify-center min-w-[70px] h-7 px-3 text-[13px] font-bold text-navy uppercase tracking-widest bg-tint border border-tint-2 rounded-[7px]">
                      Party B
                    </span>
                    <span className="text-[17px] font-semibold text-sutra-ink">
                      {s.party_b_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-[16px] text-sutra-ink-2">
                    <b className="text-sutra-ink font-bold">
                      {s.documents?.length ?? 0}
                    </b>{" "}
                    documents &nbsp;·&nbsp; Filed{" "}
                    {new Date(s.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <Link
                    href={`/mediation/${s.id}`}
                    className="inline-flex items-center gap-2 bg-white text-navy border-2 border-navy rounded-xl text-[16px] font-bold px-5 py-2.5 min-h-[46px] transition-colors hover:bg-navy hover:text-white no-underline"
                  >
                    Open Session
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="w-[19px] h-[19px]"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isComplete =
    status === "analyzed" || status === "completed" || status === "in_analysis";
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-[15px] font-semibold px-4 py-1.5 rounded-full ${
        isComplete ? "bg-green-bg text-green-ink" : "bg-amber-bg text-amber-ink"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-none ${
          isComplete ? "bg-green-dot" : "bg-amber-dot"
        }`}
      />
      {isComplete ? "Analysis complete" : "Awaiting analysis"}
    </span>
  );
}
