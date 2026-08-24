"use client";

import { jsPDF, GState } from "jspdf";
import { MediationSession } from "./api";

export type SummaryMode = "party_a" | "party_b" | "combined";

// ============================================================
// LEGAL DOCUMENT GEOMETRY  (A4, 1" margins, binding gutter)
// ============================================================
const A4_W = 595.28;
const A4_H = 841.89;
const M_TOP = 80;
const M_BOTTOM = 70;
const M_LEFT = 74;
const M_RIGHT = 58;
const BODY_W = A4_W - M_LEFT - M_RIGHT;

const BODY_SIZE = 11.5; // Times body
const BODY_LH = 18.5;   // generous leading, as in legal filings
const MONO_SIZE = 9.5;  // Courier meta / caption
const MONO_LH = 15;

type RGB = [number, number, number];
const INK: RGB = [26, 24, 22]; // near-black ink
const MUTED: RGB = [92, 86, 80]; // slate-brown for meta lines
const RULE: RGB = [110, 100, 92];
const SEAL: RGB = [52, 43, 74]; // deep legal indigo (title rule + signature)

function rgb(c: RGB) {
  return c.join(",");
}

function fmtScore(v: number | string | null | undefined, fallback = 50): string {
  return `${Number(v ?? fallback).toFixed(0)}%`;
}

function fmtDate(d?: string | null): string {
  const now = d ? new Date(d) : new Date();
  return now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function upper(s: string): string {
  return (s || "").toUpperCase();
}

/**
 * Keep all glyphs within the PDF standard-font WinAnsi encoding.
 * The rupee sign is not in WinAnsi; legal documents write "Rs." instead.
 */
function legalize(text: string): string {
  return (text || "")
    .replace(/\u20B9/g, "Rs. ")
    .replace(
      /[^\x00-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u2122\u20AC\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC]/g,
      ""
    );
}

// ============================================================
// PAGE / CURSOR HELPERS
// ============================================================
class LegalDoc {
  doc: jsPDF;
  y: number;
  pageCount = 1;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    this.y = M_TOP;
    this.doc.setProperties({
      title: "Mediation Case Summary",
      subject: "AI-assisted mediation analysis",
      author: "Mediator",
      creator: "Sutra Mediation Workspace",
    });
    this.watermark();
    this.footer(1);
  }

  /** faint diagonal CONFIDENTIAL watermark behind the page */
  private watermark() {
    const d = this.doc;
    d.saveGraphicsState();
    d.setGState(new GState({ opacity: 0.05 }));
    d.setFont("times", "bold");
    d.setFontSize(96);
    d.setTextColor(...MUTED);
    d.text("CONFIDENTIAL", A4_W / 2, A4_H / 2, { angle: 42, align: "center" });
    d.restoreGraphicsState();
  }

  private footer(page: number) {
    const d = this.doc;
    const fy = A4_H - 40;
    d.setDrawColor(...RULE);
    d.setLineWidth(0.6);
    d.line(M_LEFT, fy, A4_W - M_RIGHT, fy);
    d.setFont("courier", "normal");
    d.setFontSize(7.5);
    d.setTextColor(...MUTED);
    d.text("CONFIDENTIAL — SUBJECT TO MEDIATION PRIVILEGE", M_LEFT, fy + 14);
    d.text(`Page ${page} of`, A4_W - M_RIGHT, fy + 14, { align: "right" });
  }

  /** ensure `needed` points fit on this page, else start a new one */
  space(needed: number) {
    if (this.y + needed > A4_H - M_BOTTOM) {
      this.doc.addPage();
      this.pageCount += 1;
      this.y = M_TOP;
      this.watermark();
      this.footer(this.pageCount);
    }
  }

  // ---------- primitive draws ----------
  rule() {
    this.space(16);
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.6);
    this.doc.line(M_LEFT, this.y, A4_W - M_RIGHT, this.y);
    this.y += 14;
  }

  mono(text: string, opts: { bold?: boolean; size?: number; color?: RGB; center?: boolean; lh?: number } = {}) {
    const size = opts.size ?? MONO_SIZE;
    this.space(size * 1.5);
    this.doc.setFont("courier", opts.bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(opts.color ?? INK));
    this.doc.text(legalize(text), opts.center ? A4_W / 2 : M_LEFT, this.y, { align: opts.center ? "center" : "left" });
    this.y += opts.lh ?? MONO_LH;
  }

  monoWrap(text: string, opts: { bold?: boolean; size?: number; color?: RGB; indent?: number; lh?: number } = {}) {
    const size = opts.size ?? MONO_SIZE;
    const indent = opts.indent ?? 0;
    const width = BODY_W - indent;
    this.doc.setFont("courier", opts.bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(opts.color ?? INK));
    const lines = this.doc.splitTextToSize(legalize(text), width) as string[];
    for (const line of lines) {
      this.space(size * 1.5);
      this.doc.text(line, M_LEFT + indent, this.y);
      this.y += opts.lh ?? MONO_LH;
    }
  }

  /** centered block of lines, used for the caption */
  captionLines(lines: { text: string; bold?: boolean; size?: number }[], gap = 4) {
    const total = lines.reduce((s, l) => s + (l.size ?? 10) * 1.4, 0) + gap * (lines.length - 1);
    this.space(total);
    for (const l of lines) {
      const size = l.size ?? 10;
      this.doc.setFont("courier", l.bold ? "bold" : "normal");
      this.doc.setFontSize(size);
      this.doc.setTextColor(...INK);
      this.doc.text(legalize(l.text), A4_W / 2, this.y, { align: "center" });
      this.y += size * 1.4;
    }
    this.y += 6;
  }

  /** section heading: uppercase Times bold + hairline */
  heading(text: string, opts: { num?: string; color?: RGB } = {}) {
    this.space(44);
    this.y += 6;
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(12.5);
    this.doc.setTextColor(...(opts.color ?? SEAL));
    const prefix = opts.num ? `${opts.num}   ` : "";
    this.doc.text(prefix + upper(text), M_LEFT, this.y);
    this.y += 6;
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.5);
    this.doc.line(M_LEFT, this.y, A4_W - M_RIGHT, this.y);
    this.y += 16;
  }

  /** justified Times paragraph */
  para(text: string, opts: { size?: number; indent?: number; firstIndent?: number } = {}) {
    const size = opts.size ?? BODY_SIZE;
    const indent = opts.indent ?? 0;
    const width = BODY_W - indent;
    const lines = this.doc.splitTextToSize(legalize(text), width) as string[];
    for (let i = 0; i < lines.length; i++) {
      this.space(size * 1.6);
      let x = M_LEFT + indent;
      if (i === 0 && opts.firstIndent) x += opts.firstIndent;
      this.doc.setFont("times", "normal");
      this.doc.setFontSize(size);
      this.doc.setTextColor(...INK);
      const align = i === lines.length - 1 ? "left" : "justify";
      this.doc.text(lines[i], x, this.y, { align, maxWidth: width });
      this.y += size * 1.6;
    }
  }

  /** numbered legal clause: "4.1   text..." */
  clause(num: string, text: string, opts: { italic?: boolean; size?: number } = {}) {
    const size = opts.size ?? BODY_SIZE;
    this.space(size * 1.6);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...INK);
    this.doc.text(`${num}.`, M_LEFT, this.y);
    this.doc.setFont("times", opts.italic ? "italic" : "normal");
    this.doc.setTextColor(...INK);
    const x = M_LEFT + 22;
    const width = BODY_W - 22;
    const lines = this.doc.splitTextToSize(legalize(text), width) as string[];
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) this.space(size * 1.6);
      const align = i === lines.length - 1 ? "left" : "justify";
      this.doc.text(lines[i], i === 0 ? x : x + 8, this.y, { align, maxWidth: width - 8 });
      this.y += size * 1.6;
    }
  }

  /** labeled field row, Courier:  FIELD  value */
  field(label: string, value: string, opts: { indent?: number } = {}) {
    const indent = opts.indent ?? 0;
    this.space(MONO_LH);
    this.doc.setFont("courier", "bold");
    this.doc.setFontSize(MONO_SIZE);
    this.doc.setTextColor(...MUTED);
    this.doc.text(label, M_LEFT + indent, this.y);
    this.doc.setFont("courier", "normal");
    this.doc.setTextColor(...INK);
    const x = M_LEFT + indent + 120;
    const lines = this.doc.splitTextToSize(legalize(value), BODY_W - indent - 120) as string[];
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) this.space(MONO_LH);
      this.doc.text(lines[i], x, this.y);
      this.y += MONO_LH;
    }
  }

  gap(h: number) {
    this.y += h;
  }
}

// ============================================================
// ANALYSIS TYPES (flexible, since API returns `unknown`)
// ============================================================
interface AnalysisData {
  party_a_strength_score?: number | null;
  party_b_strength_score?: number | null;
  dominating_party?: string | null;
  party_a_favorable_points?: { point: string; strength?: string; precedent_citation?: string }[];
  party_b_favorable_points?: { point: string; strength?: string; precedent_citation?: string }[];
  allegation_matrix?: { allegation: string; raised_by: string; counter_argument?: string; evidentiary_status?: string }[];
  recommended_questions?: { question: string; target_party?: string; objective?: string }[];
  settlement_notes?: string;
  analyzed_at?: string;
}

interface DocData {
  original_filename?: string;
  party_type?: string;
  document_type?: string;
  file_url?: string;
}

// ============================================================
// BUILDERS
// ============================================================
function drawCaption(l: LegalDoc, session: MediationSession, partyAName: string, partyBName: string) {
  const d = l.doc;
  l.captionLines(
    [
      { text: "BEFORE THE MEDIATOR", bold: true, size: 11 },
      { text: "IN THE MATTER OF MEDIATION PROCEEDINGS", size: 9.5 },
      { text: "UNDER THE INDIAN MEDIATION ACT, 2023", size: 9.5 },
    ],
    3
  );
  // case number rule
  l.space(8);
  d.setDrawColor(...RULE);
  d.setLineWidth(0.8);
  d.line(M_LEFT, l.y, A4_W - M_RIGHT, l.y);
  l.y += 10;
  const sessionCode = (session as any).session_code || `MED-${String(session.id).padStart(4, "0")}`;
  l.mono(`MEDIATION CASE NO. ${sessionCode}`, { bold: true, center: true, size: 10.5 });
  d.setDrawColor(...RULE);
  d.setLineWidth(0.8);
  d.line(M_LEFT, l.y, A4_W - M_RIGHT, l.y);
  l.y += 16;

  // parties
  l.mono(`BETWEEN :  ${partyAName.toUpperCase()}  ......... CLAIMANT`, { size: 9.5 });
  const aAdvocate = (session as any).party_a_advocate;
  if (aAdvocate) {
    l.mono(`          (${upper(aAdvocate)})`, { size: 8.5, color: MUTED });
  }
  l.mono(`          AND`);
  l.mono(`          ${partyBName.toUpperCase()}  ......... RESPONDENT`, { size: 9.5 });
  const bAdvocate = (session as any).party_b_advocate;
  if (bAdvocate) {
    l.mono(`          (${upper(bAdvocate)})`, { size: 8.5, color: MUTED });
  }
  l.gap(10);
}

function drawTitle(l: LegalDoc, mode: SummaryMode, session: MediationSession) {
  const d = l.doc;
  l.space(50);
  l.y += 4;
  const title =
    mode === "combined"
      ? "CONSOLIDATED MEDIATION CASE SUMMARY"
      : mode === "party_a"
      ? `CASE SUMMARY — ${upper(session.party_a_name)}`
      : `CASE SUMMARY — ${upper(session.party_b_name)}`;
  d.setFont("times", "bold");
  d.setFontSize(15);
  d.setTextColor(...INK);
  const lines = d.splitTextToSize(legalize(title), BODY_W) as string[];
  for (const line of lines) {
    l.space(20);
    d.text(line, A4_W / 2, l.y, { align: "center" });
    l.y += 20;
  }
  // seal-coloured title rule
  l.y += 2;
  d.setDrawColor(...SEAL);
  d.setLineWidth(1.1);
  d.line(A4_W / 2 - 110, l.y, A4_W / 2 + 110, l.y);
  l.y += 14;
  d.setFont("times", "italic");
  d.setFontSize(9.5);
  d.setTextColor(...MUTED);
  d.text(
    `Prepared with AI-assisted analysis  •  Generated ${fmtDate(undefined)}  •  Status: ${upper(session.status)}`,
    A4_W / 2,
    l.y,
    { align: "center" }
  );
  l.y += 18;
}

function drawSignature(l: LegalDoc) {
  l.space(110);
  l.y += 14;
  const d = l.doc;
  d.setFont("times", "normal");
  d.setFontSize(11.5);
  d.setTextColor(...INK);
  d.text(
    `DATED this ______ day of ____________, ${new Date().getFullYear()}`,
    A4_W - M_RIGHT - 150,
    l.y,
    { align: "right", maxWidth: 200 }
  );
  l.y += 34;
  d.text("MEDIATOR", A4_W - M_RIGHT - 150, l.y, { align: "right", maxWidth: 200 });
  l.y += 3;
  d.setDrawColor(...INK);
  d.setLineWidth(0.7);
  d.line(A4_W - M_RIGHT - 250, l.y, A4_W - M_RIGHT, l.y);
  l.y += 12;
  d.setFont("times", "italic");
  d.setFontSize(9.5);
  d.setTextColor(...MUTED);
  d.text("Mediator's Signature", A4_W - M_RIGHT - 150, l.y, { align: "right", maxWidth: 200 });
}

export function buildSummaryPdf(session: MediationSession, mode: SummaryMode): jsPDF {
  const l = new LegalDoc();
  const analysis = (session.analysis || {}) as AnalysisData;
  const documents = (session.documents || []) as DocData[];
  const partyAName = session.party_a_name;
  const partyBName = session.party_b_name;
  const aScore = fmtScore(analysis.party_a_strength_score);
  const bScore = fmtScore(analysis.party_b_strength_score);

  const partyAFavorable = analysis.party_a_favorable_points || [];
  const partyBFavorable = analysis.party_b_favorable_points || [];
  const matrix = analysis.allegation_matrix || [];
  const questions = analysis.recommended_questions || [];
  const aDocs = documents.filter((d) => d.party_type === "PARTY_A");
  const bDocs = documents.filter((d) => d.party_type === "PARTY_B");

  drawCaption(l, session, partyAName, partyBName);
  drawTitle(l, mode, session);

  const sessionCode = (session as any).session_code || `MED-${String(session.id).padStart(4, "0")}`;

  // ---------- 1. PRELIMINARY RECORD ----------
  l.heading("Preliminary Record", { num: "1." });
  l.field("SESSION", sessionCode);
  l.field("STATUS", upper(session.status));
  l.field("TITLE", session.title);
  l.field("PARTY A", partyAName);
  l.field("PARTY B", partyBName);
  l.field("ANALYSED", fmtDate(analysis.analyzed_at));

  // ---------- 2. DISPUTE BACKGROUND ----------
  l.heading("Dispute Background", { num: "2." });
  l.para(session.dispute_summary || "No dispute background has been recorded for this mediation session.");

  // ---------- 3. CASE POSITION ASSESSMENT ----------
  l.heading("Case Position Assessment", { num: "3." });
  l.para(
    `Upon a comparative examination of the records, the case position of the parties has been assessed at ${aScore} in favour of ${partyAName} (Party A) and ${bScore} in favour of ${partyBName} (Party B).`
  );
  l.gap(4);
  l.mono(`PARTY A  ${partyAName.toUpperCase().padEnd(52).slice(0, 52)} ${aScore.padStart(5)}`, { size: 9 });
  l.mono(`PARTY B  ${partyBName.toUpperCase().padEnd(52).slice(0, 52)} ${bScore.padStart(5)}`, { size: 9 });
  l.gap(6);
  const dom =
    analysis.dominating_party === "PARTY_A"
      ? `${partyAName} (Party A) holds the stronger position.`
      : analysis.dominating_party === "PARTY_B"
      ? `${partyBName} (Party B) holds the stronger position.`
      : "The positions of the parties are balanced; no party holds a clear advantage.";
  l.para(`Assessment: ${dom}`);

  // ---------- 4/5. POINTS IN FAVOUR ----------
  let clauseNo = 4;
  const drawPoints = (partyLabel: string, points: { point: string; strength?: string; precedent_citation?: string }[], headingText: string) => {
    l.heading(headingText, { num: `${clauseNo}.` });
    if (points.length === 0) {
      l.para("No favourable points have been extracted for this party at this stage.");
    } else {
      points.forEach((p, i) => {
        l.clause(`${clauseNo}.${i + 1}`, p.point);
        if (p.precedent_citation) {
          l.para(`Citation: ${p.precedent_citation}`, { size: 10, indent: 22 });
        }
        if (p.strength) {
          l.para(`Evidentiary strength: ${upper(p.strength)}`, { size: 10, indent: 22 });
        }
      });
    }
    clauseNo += 1;
  };

  if (mode === "combined" || mode === "party_a") {
    drawPoints(partyAName, partyAFavorable, `Points in Favour of ${upper(partyAName)} (Party A)`);
  }
  if (mode === "combined" || mode === "party_b") {
    drawPoints(partyBName, partyBFavorable, `Points in Favour of ${upper(partyBName)} (Party B)`);
  }

  // ---------- ALLEGATIONS & COUNTER-ARGUMENTS ----------
  const relevantMatrix = matrix.filter((m) =>
    mode === "combined" ? true : mode === "party_a" ? m.raised_by === "PARTY_B" : m.raised_by === "PARTY_A"
  );
  l.heading(
    mode === "combined"
      ? "Allegations and Counter-Arguments"
      : mode === "party_a"
      ? `Allegations Against ${upper(partyAName)}`
      : `Allegations Against ${upper(partyBName)}`,
    { num: `${clauseNo}.` }
  );
  if (relevantMatrix.length === 0) {
    l.para("No allegation matrix entries are available for this record.");
  } else {
    relevantMatrix.forEach((m, i) => {
      const raisedBy = m.raised_by === "PARTY_A" ? partyAName : partyBName;
      l.clause(`${clauseNo}.${i + 1}`, m.allegation);
      l.para(`Raised by: ${raisedBy}`, { size: 10, indent: 22 });
      if (m.counter_argument) l.para(`Rebuttal: ${m.counter_argument}`, { size: 10, indent: 22 });
      l.para(`Evidentiary status: ${m.evidentiary_status || "Under evaluation"}`, { size: 10, indent: 22 });
    });
  }
  clauseNo += 1;

  // ---------- RECOMMENDED QUESTIONS ----------
  const relevantQuestions = questions.filter((q) =>
    mode === "combined" ? true : q.target_party === (mode === "party_a" ? "PARTY_A" : "PARTY_B") || q.target_party === "BOTH"
  );
  l.heading("Recommended Questions for the Mediation Session", { num: `${clauseNo}.` });
  if (relevantQuestions.length === 0) {
    l.para("No recommended questions have been generated at this stage.");
  } else {
    relevantQuestions.forEach((q, i) => {
      const target =
        q.target_party === "PARTY_A" ? partyAName : q.target_party === "PARTY_B" ? partyBName : "Both Parties";
      l.clause(`${clauseNo}.${i + 1}`, q.question);
      if (q.objective) l.para(`Objective: ${q.objective}`, { size: 10, indent: 22 });
      l.para(`Target: ${target}`, { size: 10, indent: 22 });
    });
  }
  clauseNo += 1;

  // ---------- EVIDENCE ON RECORD (combined only) ----------
  if (mode === "combined") {
    const allDocs = [...aDocs, ...bDocs];
    l.heading("Evidence on Record", { num: `${clauseNo}.` });
    if (allDocs.length === 0) {
      l.para("No documentary evidence has been uploaded on record at this stage.");
    } else {
      allDocs.forEach((d, i) => {
        const owner = d.party_type === "PARTY_A" ? `${partyAName} (Party A)` : `${partyBName} (Party B)`;
        l.clause(`${clauseNo}.${i + 1}`, d.original_filename || "Untitled Document");
        l.para(`Filed by: ${owner}  •  Type: ${upper(d.document_type || "General")}`, { size: 10, indent: 22 });
      });
    }
    clauseNo += 1;
  }

  // ---------- SETTLEMENT NOTES (combined only) ----------
  if (mode === "combined") {
    l.heading("Mediator's Settlement Notes", { num: `${clauseNo}.` });
    if (analysis.settlement_notes && analysis.settlement_notes.trim()) {
      l.para(analysis.settlement_notes);
    } else {
      l.para("No settlement notes have been recorded at this stage. Notes recorded under Section 27 of the Mediation Act, 2023 may form the basis of an enforceable mediated settlement agreement.");
    }
  }

  // ---------- SIGNATURE ----------
  drawSignature(l);

  // ---------- FINALIZE PAGE NUMBERS ----------
  const total = l.doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    l.doc.setPage(p);
    l.doc.setFont("courier", "normal");
    l.doc.setFontSize(7.5);
    l.doc.setTextColor(...MUTED);
    l.doc.text(`${p}`, A4_W - M_RIGHT, A4_H - 26, { align: "right" });
  }

  return l.doc;
}

export function downloadSummaryPdf(session: MediationSession, mode: SummaryMode): void {
  const doc = buildSummaryPdf(session, mode);
  const suffix = mode === "combined" ? "Consolidated_Summary" : mode === "party_a" ? "Party_A_Summary" : "Party_B_Summary";
  const sessionCode = (session as any).session_code || `MED-${String(session.id).padStart(4, "0")}`;
  doc.save(`${sessionCode}_${suffix}.pdf`);
}
