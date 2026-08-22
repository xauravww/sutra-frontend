"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mediation, type MediationSession } from "@/lib/api";

export default function MediationSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = Number(params.id);

  const [session, setSession] = useState<MediationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: string; content: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    mediation
      .get(sessionId)
      .then((res) => setSession(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await mediation.analyze(sessionId);
      const res = await mediation.get(sessionId);
      setSession(res.data);
    } catch {}
    setAnalyzing(false);
  };

  const handleChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const res = await mediation.chat(sessionId, q);
      const answer = (res as any)?.data?.answer ?? "No response available.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get response. Please try again." },
      ]);
    }
    setChatLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[940px] mx-auto px-6 py-8 text-center text-sutra-ink-3">
          Loading…
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[940px] mx-auto px-6 py-8 text-center">
          <p className="text-sutra-ink-3 mb-4">Session not found.</p>
          <Link href="/mediation" className="text-navy font-semibold hover:underline">
            ← Back to sessions
          </Link>
        </main>
      </div>
    );
  }

  const analysis = session.analysis as any;
  const docs = session.documents ?? [];

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="max-w-[940px] mx-auto px-6 py-8 pb-21">
        {/* Back link */}
        <Link
          href="/mediation"
          className="inline-flex items-center gap-2.5 text-navy font-semibold text-[16px] no-underline mb-5 px-0.5 py-1.5 hover:text-navy-dark transition-colors group"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Back to sessions
        </Link>

        {/* Hero */}
        <section className="bg-white border border-sutra-line border-t-[3px] border-t-navy rounded-2xl p-[26px_30px_28px] mb-5">
          <div className="flex items-center gap-3.5 flex-wrap mb-3.5">
            <span className="text-[15px] font-bold text-navy tracking-wider bg-tint border border-tint-2 py-1.5 px-3.5 rounded-[9px]">
              MED-{String(session.id).padStart(4, "0")}
            </span>
            <StatusBadge status={session.status} />
          </div>

          <h1 className="text-[29px] font-bold leading-[1.28] tracking-tight mb-5">
            {session.title}
          </h1>

          {/* Parties */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3.5 bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-4 max-[760px]:grid-cols-1 max-[760px]:gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="flex-none w-[42px] h-[42px] rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[17px] border border-[#CFE0F0]">
                A
              </span>
              <div>
                <div className="text-[12.5px] font-bold uppercase tracking-widest text-sutra-ink-3">
                  Party A
                </div>
                <div className="text-[17px] font-semibold text-sutra-ink leading-tight">
                  {session.party_a_name}
                </div>
              </div>
            </div>
            <span className="font-serif italic text-[16px] text-sutra-ink-3 max-[760px]:hidden">
              v.
            </span>
            <div className="flex items-center gap-3.5 min-w-0 max-[760px]:border-t max-[760px]:border-sutra-line-2 max-[760px]:pt-4">
              <span className="flex-none w-[42px] h-[42px] rounded-full bg-tint-2 text-navy grid place-items-center font-bold text-[17px] border border-[#CFE0F0]">
                B
              </span>
              <div>
                <div className="text-[12.5px] font-bold uppercase tracking-widest text-sutra-ink-3">
                  Party B
                </div>
                <div className="text-[17px] font-semibold text-sutra-ink leading-tight">
                  {session.party_b_name}
                </div>
              </div>
            </div>
          </div>

          {/* Meta chips */}
          <div className="flex gap-2.5 flex-wrap mt-4">
            <span className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-sutra-ink-2 bg-white border border-sutra-line rounded-full py-[7px] px-3.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="w-4 h-4 text-sutra-ink-3"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" />
              </svg>
              Filed{" "}
              {new Date(session.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-sutra-ink-2 bg-white border border-sutra-line rounded-full py-[7px] px-3.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="w-4 h-4 text-sutra-ink-3"
              >
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              {docs.length} documents
            </span>
          </div>
        </section>

        {/* Overview */}
        <Section
          icon={<path d="M4 5h16M4 10h16M4 15h10M4 20h7" />}
          title="Overview"
        >
          <p className="text-[17px] text-sutra-ink-2 leading-relaxed">
            {session.dispute_summary || "No dispute summary provided."}
          </p>
        </Section>

        {/* Documents */}
        <Section
          icon={
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          }
          title="Documents on record"
          hint={`${docs.length} documents submitted.`}
        >
          {docs.length === 0 ? (
            <p className="text-sutra-ink-3">No documents uploaded yet.</p>
          ) : (
            <ul className="list-none">
              {docs.map((d: any, i: number) => (
                <li
                  key={d.id ?? i}
                  className="flex items-center gap-3.5 py-3.5 border-t border-sutra-line-2 first:border-t-0"
                >
                  <span className="flex-none w-10 h-10 rounded-[10px] bg-[#F2F5F9] border border-sutra-line-2 text-sutra-ink-3 grid place-items-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="w-5 h-5"
                    >
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-[16.5px] font-semibold text-sutra-ink leading-tight">
                      {d.original_filename ?? `Document ${i + 1}`}
                    </div>
                    <div className="text-[13.5px] text-sutra-ink-3 mt-0.5 font-medium">
                      {d.document_type ?? "Document"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Analysis */}
        <Section
          icon={
            <>
              <path d="m9 11 3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </>
          }
          title="AI Comparative Analysis"
          hint="Party strength scores and issue-by-issue matrix."
          action={
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-lg text-[14px] font-semibold px-4 py-2 min-h-[36px] transition-colors hover:bg-navy-dark disabled:opacity-60"
            >
              {analyzing ? "Analyzing…" : "Run Analysis"}
            </button>
          }
        >
          {analysis ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <ScoreCard
                  label="Party A"
                  score={analysis.party_a_strength_score ?? 50}
                />
                <ScoreCard
                  label="Party B"
                  score={analysis.party_b_strength_score ?? 50}
                />
              </div>
              <p className="text-[15px] text-sutra-ink-2">
                <b>Dominant party:</b>{" "}
                {analysis.dominating_party === "BALANCED"
                  ? "Balanced — no clear advantage"
                  : analysis.dominating_party}
              </p>
            </div>
          ) : (
            <p className="text-sutra-ink-3 text-[15px]">
              No analysis yet. Click &quot;Run Analysis&quot; to generate.
            </p>
          )}
        </Section>

        {/* Interactive Chat */}
        <Section
          icon={
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          }
          title="Mediator Chat"
          hint="Ask the AI about this dispute."
        >
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto mb-4">
            {chatMessages.length === 0 && (
              <p className="text-sutra-ink-3 text-[15px]">
                No messages yet. Ask a question to start the conversation.
              </p>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-xl text-[15px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-navy text-white rounded-br-sm"
                      : "bg-tint text-sutra-ink border border-sutra-line-2 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="text-sutra-ink-3 text-[14px] animate-pulse">
                Thinking…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleChat();
              }}
              placeholder="Ask about this dispute…"
              className="flex-1 min-h-[46px] border border-sutra-line rounded-xl px-4 font-[inherit] text-[15px] text-sutra-ink outline-none transition-colors focus:border-focus placeholder:text-sutra-ink-3"
            />
            <button
              onClick={handleChat}
              disabled={!chatInput.trim() || chatLoading}
              className="inline-flex items-center gap-2 bg-navy text-white border-0 rounded-xl text-[15px] font-semibold px-5 min-h-[46px] transition-colors hover:bg-navy-dark disabled:opacity-60"
            >
              Ask
            </button>
          </div>
        </Section>
      </main>
    </div>
  );
}

/* ─── Helper components ─── */

function Section({
  icon,
  title,
  hint,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-sutra-line rounded-2xl p-[28px_30px] mb-5">
      <div className="flex items-start gap-4 mb-5">
        <span className="flex-none w-11 h-11 rounded-[12px] bg-tint text-navy grid place-items-center border border-tint-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[23px] h-[23px]"
          >
            {icon}
          </svg>
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight leading-snug">
              {title}
            </h2>
            {action}
          </div>
          {hint && (
            <p className="text-[15px] text-sutra-ink-3 mt-0.5">{hint}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-[#FAFBFD] border border-sutra-line-2 rounded-xl p-4">
      <div className="text-[12.5px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-2">
        {label}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[31px] font-bold tracking-tight">{score}</span>
        <span className="text-[15px] text-sutra-ink-3 mb-1">/ 100</span>
      </div>
      <div className="mt-2 h-2 bg-sutra-line-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-navy rounded-full transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
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
