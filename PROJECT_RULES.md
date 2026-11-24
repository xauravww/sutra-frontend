# PROJECT RULES — Sutra Frontend

Read this before every change. This file is the actionable translation of the rules the
sibling projects in `/root` share (learnkit-v2, playaftr, nebulaplan/project-planner-next,
saltinsocial-frontend-v2). Where a sibling differs, this file is the source of truth for
**this** codebase. Iterate on it: when a rule changes or a new one is accepted, update this
file so the next edit starts from a known baseline.

Last synced from siblings: 2026-11-24.

---

## Project facts

| Thing | Value |
|---|---|
| Stack | Next.js 16 (App Router), React 19, Tailwind v4 (`@tailwindcss/postcss`) |
| Runtime | dev server on **PM2**, name `sutra-frontend`, port **3100** (`next dev -p 3100`) |
| Backend | `tvsbackend-upgraded` on port **3015** (`/api/v1`; modernized feature set) |
| Head | `src/app/layout.tsx` — fonts via `next/font/google` (Public Sans, **Newsreader**, **Inter**) |
| Home page | `src/app/page.tsx` (landing; was a redirect to `/login`) |
| Global styles | `src/app/globals.css` (Tailwind v4 `@theme` tokens + landing motion) |

## Design tokens (this app)

Bespoke editorial "record/docket" system — fully original, no theme. Warm paper,
dark ink, hairline rules, one deep-green accent, serif display. Deliberately unlike
any SaaS template.

| Token | Value |
|---|---|
| Paper (background) | `#F5F1E9` |
| Paper lift | `#FBF9F3` |
| Ink / text | `#1B1611` |
| Soft text | `#4A4238` |
| Hairline / rule | `#E2DAC9` |
| Accent (deep green) | `#1F3A2F` (seal, current-stage dot, em word) |
| Display font | Newsreader (`var(--font-newsreader)`), serif, 400–700 |
| Body font | Inter (`var(--font-inter)`) |
| Corners | sharp; seal/status dots rounded |
| Shadow | soft stacked-paper `0 30px 60px -28px rgba(27,22,17,.45)` |
| Legacy app font | Public Sans (`var(--font-public-sans)`) |
| Visual language | layered paper folios, ruled ledger rows, index rows, seal motif |

---

## Rule 1 — Writing: plain, no em dashes, no AI slop, no sparkle icons

- **No em or en dashes** (`—`, `–`, ` -- `), no ellipsis `...` or `..` to join ideas.
  Use a comma, a colon, or a full stop. Rewrite instead of reaching for a dash.
- **No AI buzzwords**: `delve`, `moreover`, `furthermore`, `seamless`, `robust`,
  `supercharge`, `unlock`, `leverage`, `empower`, `revolutionize`, `next-generation`,
  `cutting-edge`, `state-of-the-art`, `elevate`. Say what it does in plain facts.
- **No sparkle / ✨ decorative icons** (`Sparkles` lucide icon included). Icons must carry
  functional meaning: `Scale`/`Gavel` for justice, `Bot` for AI, `Check`, `ArrowRight`,
  `FileText`, `ListChecks`, `ShieldCheck`. Never decoration.
- **No trailing period** on titles, headings, eyebrows, buttons, or labels. Periods are for
  full-sentence body text only.
- **No decorative furniture**: no dots next to eyebrows, `[01]` counts, watermark words, or
  a tagline that repeats the heading. One eyebrow + one heading + one line of copy.

## Rule 2 — Components & centralized theme (never hardcode)

- Use shared/atomic styling. Read colors, radii, and fonts from the tokens above
  (`globals.css` `@theme` + the landing CSS). No stray literal hex at a call site unless it
  is a documented token value.
- Prefer composition: `Link`/`a` for navigation, solid ink or green buttons as a consistent style,
  `FeatureCard`/`Step`/`ProductMock` for the landing. Do not re-implement the same control
  per page.

## Rule 3 — Minimalism: add nothing unnecessary

- Every element earns its place: it informs, enables an action, or clarifies. Cut the rest.
- No fake metrics, no stock quotes, no filler copy. Compact and readable beats airy.

## Rule 4 — Motion

- Content is visible at rest; never start content hidden behind `opacity: 0` on scroll.
- Landing motion lives in `globals.css`: `.land-enter` (one-time entrance), `.land-card`
  (hover lift), `.land-btn` (step + press). Use these; do not invent per-page animation.
- Respect `prefers-reduced-motion` (already covered by `.land-enter` media guard).

## Rule 5 — Layout & responsiveness

- Mobile-first from `320px` up to `1440px+`; no horizontal overflow (fluid `max-w-*`,
  wrap headings, no fixed widths).
- Tap targets ≥ 44px on mobile (buttons, links, inputs).
- One consistent container (`max-w-6xl mx-auto px-5`); content sits on the container edges.
- Sections are one screen or two; no second section heading peeking into the previous screen.

## Rule 6 — Copy & hard facts

- The first screen states what is sold and for whom, with a concrete fact.
- Headings name the thing (product / section noun). Buttons are a verb + object
  (`Start free trial`, `Sign in`, `Get started`).
- Footer + nav links point somewhere real (`/login`, `/register`, section anchors). Never
  `href="#"` except for intentionally-placeholder legal links flagged as such.

## Rule 7 — Architecture

- Semantic structure: `<header>`/`<nav>` and `<footer>` outside `<main>`; sections inside
  `<main>`.
- Static page content is a server component (no `"use client"`); add `"use client"`
  only where interactivity (state, forms, toggles) is required.
- Auth: `/login` and `/register` are the entry routes; protected app routes rely on the
  existing `AuthProvider` (`src/lib/auth-context.tsx`).

## Rule 8 — Workflow & process

- Iterate in dev mode on PM2 (`pm2 logs sutra-frontend`, hot reload on :3100).
- After changing server-side env/config or API wiring, restart the PM2 process and confirm it
  is listening before reporting done.
- Do **not** run `npm run build` during ordinary development/checks; rely on the dev server,
  `npm run lint`, and type checking. (Build only when intentionally producing a production
  artifact.)
- Keep the E2E/API testing context: see `/root/E2E_TEST_REPORT.md` and
  `/root/HOMEPAGE_DESIGN_REFERENCE.md`.

## Rule 9 — Not applicable here (inherited from siblings, dropped)

- Multi-language / next-intl — this app ships an English UI.
- A single "one-font" rule — we use a 3-family token set (Newsreader / Inter / Public Sans).
- Stock-photo libraries — no Unsplash-style photography in this project.
- Runtime tenant roles / admin CRUD rules that belong to the backend repo, not frontend.

---

## Rule 10 — Product language: never lead with "AI"

- In user-facing copy, do not name the technology as "AI" ("AI-powered", "AI draft", "AI
  copilot"). Present capability through confident system language, or name the workflow
  outcome directly.
- Strong alternatives: **the system**, **the drafting engine**, **automated agents**,
  **the analysis pipeline**, or a concrete verb ("drafts the document", "surfaces issues",
  "turns uploads into structured drafts").
- "AI" is allowed only where it is essential technical information (docs, API notes, backend
  code); never as a marketing headline. The product should read as a finished tool, not a
  gimmick.

---

## Review checklist (before calling a change done)

1. No em/en dashes or ellipsis in UI copy (`grep -rnE '—|–|\.\.\.' src`).
2. No `Sparkles`/sparkle/✨ anywhere.
3. No trailing period on headings, buttons, or labels.
4. No literal hex at a call site outside the documented token set.
5. Motion only through `.land-enter` / `.land-card` / `.land-btn`.
6. No horizontal overflow at 320px; tap targets ≥ 44px.
7. Semantic `<header>/<main>/<footer>`; static pages are server components.
8. Dev server online on PM2 (port 3100) and serving HTTP 200 after changes.
9. No bare "AI" in user-facing copy (`grep -n "AI" src/app/page.tsx` returns nothing).
