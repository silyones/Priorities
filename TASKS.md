# CLAUDE.md — People's Priorities: Complete Project Reference

This file is the single source of truth for any AI coding assistant (Claude, Cursor, Copilot, etc.)
continuing work on this project. Read it fully before touching any file.

---

## 1. What This Product Is

**People's Priorities** is an AI platform for constituency development planning, built for the
Google Cloud × Hack2skill hackathon (Track 01). Citizens submit development needs (voice or text,
any language). The backend clusters those voices into ranked themes. An MP's office triages those
themes. Completed work is published to a public showcase.

**The one non-negotiable design rule (enforced everywhere in code):**
No field, API response, or UI surface may read as a failure metric.
No `daysOpen`, `backlogCount`, `unresolvedSince`, or "MP responded to X%" anywhere.
Every number is a record of action taken, not inaction.

---

## 2. Monorepo Structure — What Every Folder Does

```
peoples-priorities/
├── backend/                   ← Express.js API server (port 3001)
│   ├── src/
│   │   ├── types.ts           ← THE domain model. Every shape in the system.
│   │   ├── store.ts           ← THE only file allowed to mutate data.
│   │   ├── seed.ts            ← Mock data. 13 realistic clusters.
│   │   ├── datasets.ts        ← 3 dataset tables joined at scoring time.
│   │   ├── server.ts          ← Express routes. No business logic here.
│   │   └── ai/
│   │       ├── structure.ts   ← Converts raw text → StructuredRecord
│   │       ├── cluster.ts     ← Bag-of-words embed + cosine similarity matching
│   │       └── score.ts       ← Priority score formula (demand + urgency + data)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                  ← Next.js 14 App Router (port 3000)
│   ├── app/
│   │   ├── layout.tsx         ← Root layout: SiteNav + SplashScreen + fonts
│   │   ├── globals.css        ← Tailwind base + dark theme design tokens
│   │   ├── loading.tsx        ← Page-transition skeleton (amber logo pulse)
│   │   ├── page.tsx           ← Dashboard (server component → DashboardClient)
│   │   ├── submit/page.tsx    ← Citizen/relay intake form
│   │   ├── mp/page.tsx        ← MP triage tool (server → MpTriageClient)
│   │   ├── showcase/page.tsx  ← Public showcase (server → ShowcaseClient)
│   │   └── insights/page.tsx  ← Judge/technical view (server → InsightsClient)
│   ├── components/
│   │   ├── DashboardClient.tsx   ← Dashboard bento grid with animations
│   │   ├── MpTriageClient.tsx    ← MP triage card-stack (Framer Motion drag)
│   │   ├── ShowcaseClient.tsx    ← Published outcomes grid
│   │   ├── InsightsClient.tsx    ← Hotspot map + scoring breakdown
│   │   ├── TriageCard.tsx        ← One draggable triage card
│   │   ├── PublishModal.tsx      ← Publish-to-showcase dialog
│   │   ├── HotspotMap.tsx        ← SVG constituency map (no external lib)
│   │   ├── VoiceButton.tsx       ← Web Speech API voice capture
│   │   ├── SiteNav.tsx           ← Dark sticky topbar, amber active tab
│   │   ├── SplashScreen.tsx      ← First-visit welcome animation
│   │   ├── Logo.tsx              ← Amber icon mark + wordmark
│   │   ├── ui.tsx                ← CategoryBadge, StatusDot, UrgencyTag
│   │   └── motion.tsx            ← Reveal, Stagger, Counter primitives
│   ├── lib/
│   │   ├── types.ts           ← Frontend copy of domain model (keep in sync with backend)
│   │   └── api.ts             ← API_BASE util — ALL fetch() calls go through here
│   ├── .env.local             ← NEXT_PUBLIC_API_URL=http://localhost:3001
│   ├── tailwind.config.ts     ← Dark color palette: night, amber, jade, coral
│   ├── tsconfig.json
│   ├── next.config.mjs
│   └── package.json
│
├── CLAUDE.md                  ← This file
└── README.md                  ← Quick-start for humans
```

---

## 3. The Enforced Boundary Rule (NEVER violate this)

**Frontend code MUST NOT import from `backend/src/` directly.**
Frontend talks to the backend only via `fetch()` → `API_BASE/api/*`.

The ONLY permitted exception: `submit/page.tsx` contains an inlined `detectLanguage()` function
(copied from `backend/src/ai/structure.ts`) that runs client-side for live UX feedback (the
"Detected: Hindi" pill as the user types). This is a pure, side-effect-free function. No other
backend logic may be shared this way.

```
WRONG: import { getClusters } from "../../backend/src/store"  ← NEVER
RIGHT: const res = await fetch(`${API_BASE}/api/clusters`)    ← always
```

**Why:** Backend can be swapped to a real database, moved to Cloud Run, replaced with Firebase
— without touching a single frontend file.

---

## 4. How to Run

```bash
# Terminal 1 — Backend (Express, port 3001)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (Next.js, port 3000)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend reads `NEXT_PUBLIC_API_URL=http://localhost:3001`
from `frontend/.env.local`.

---

## 5. The Four API Routes (backend/src/server.ts)

All routes are thin: parse → call one store.ts function → return JSON. Zero business logic here.

| Method | Path                  | Store function    | Purpose                        |
|--------|-----------------------|-------------------|--------------------------------|
| POST   | /api/submit           | submit()          | Full 6-stage pipeline          |
| GET    | /api/clusters         | getClusters()     | All clusters ranked + stats    |
| PATCH  | /api/clusters/:id     | actOnCluster()    | MP triage action or publish    |
| GET    | /api/showcase         | getShowcase()     | Published items only           |

---

## 6. Domain Model (backend/src/types.ts + frontend/lib/types.ts)

Both files must stay identical. When you extend one, update the other.

### Key types:

**`ClusterStatus`** — `new | forwarded | handling | info | published`
There is NO `pending`, `overdue`, or `unresolved`. This is intentional.

**`Cluster`** — the most important shape. Read by /mp, /insights, /showcase — all from the same
API, just rendered differently. Fields:
- `affected`: number of voices (citizens). ONLY ever-increasing number on a cluster.
- `score`: 0–100 priority. Recomputed on every new submission joining the cluster.
- `rationale`: ScoreRationale — shown ONLY in /insights, NEVER on MP triage card.
- `sanctionedProject`: Internal-only. Auto-populated from LOCAL_DEVELOPMENT_PLANS. Never published.
- `sampleQuotes`: Up to 3 representative raw submission strings (shown in insights).
- `relayShare`: 0–1 fraction of submissions via relay path.

**`ScoreRationale`** (extended in this build beyond original spec):
```ts
{
  demandComponent: number;    // 0–55 (log scale)
  urgencyComponent: number;   // 25 | 15 | 6
  dataComponent: number;      // 0 or 20
  dataset?: PublicDatasetHit;           // infrastructure dataset citation
  demographic?: DemographicHit;         // NEW: ward population/literacy/occupation
  developmentPlan?: DevelopmentPlanHit; // NEW: planned project from dev plan
}
```

---

## 7. The Three Dataset Tables (backend/src/datasets.ts)

### Table 1: PUBLIC_DATASETS (infrastructure + public data)
Keyed by `category + ward`. Falls back to category-only if ward not found.
Used to compute `dataComponent` of priority score (+20 if a match exists).

| Category    | Ward     | Key metric                          |
|-------------|----------|-------------------------------------|
| education   | Ward 3   | School 6.4km away, 1,180 enrolled   |
| water       | Ward 12  | 41% piped water coverage            |
| sanitation  | Ward 7   | 9 waterlogging events/season        |
| health      | Ward 9   | 8,900 people per sub-centre         |
| roads       | Ward 5   | 2 habitations cut off in rain       |
| electricity | Ward 14  | 13.5 hours/day average supply       |

### Table 2: DEMOGRAPHIC_DATASETS (new — spec §8.4)
Keyed by `ward only` — applies to every cluster in that ward regardless of category.
Surface: rendered in /insights scoring panel ONLY. Never on MP triage card.

| Ward     | Population | Literacy | Occupation                    |
|----------|------------|----------|-------------------------------|
| Ward 7   | 18,400     | 71%      | Daily-wage and informal trade |
| Ward 3   | 12,900     | 64%      | Agricultural labour           |
| Ward 12  | 9,600      | 58%      | Agricultural labour           |
| Ward 5   | 4,100      | 52%      | Agricultural and pastoral     |
| Ward 9   | 7,800      | 61%      | Mixed agricultural and service|
| Ward 14  | 21,200     | 79%      | Industrial and factory work   |
| Ward 10  | 8,900      | 65%      | Mixed service                 |
| Ward 11  | 6,200      | 62%      | Agricultural labour           |
| Ward 13  | 9,100      | 67%      | Mixed agricultural            |

### Table 3: LOCAL_DEVELOPMENT_PLANS (new — spec §8.5)
Keyed by `ward`. Auto-populates `cluster.sanctionedProject` at cluster creation time.
This is what makes the demand-vs-sanction gap real data, not hardcoded strings.

| Ward     | Planned project               | Budget    | Timeline        |
|----------|-------------------------------|-----------|-----------------|
| Ward 7   | Community hall construction   | ₹38 lakh  | FY 2025–26, Q3  |
| Ward 3   | Anganwadi building renovation | ₹12 lakh  | FY 2025–26, Q2  |
| Ward 12  | Overhead water tank           | ₹22 lakh  | FY 2026–27, Q1  |
| Ward 5   | Culvert and approach road     | ₹45 lakh  | FY 2026–27, Q2  |
| Ward 9   | Sub-centre staff quarters     | ₹16 lakh  | FY 2025–26, Q4  |
| Ward 14  | Feeder upgrade                | ₹29 lakh  | FY 2026–27, Q1  |

---

## 8. The Scoring Formula (backend/src/ai/score.ts)

```
score = min(100,  demandComponent + urgencyComponent + dataComponent)

demandComponent(affected) = round(min(55, 12 × log10(affected + 1) × 2.2))
urgencyComponent = { safety: 25, high: 15, normal: 6 }
dataComponent    = 20 if PUBLIC_DATASETS has a match, else 0
```

Why logarithmic demand: prevents a single huge cluster (340 voices) from permanently dominating
every smaller but more urgent theme. A cluster of 340 and 900 score only a few points apart.

---

## 9. The 13 Seed Clusters (backend/src/seed.ts)

Designed to cover every feature visible at first launch with no user interaction:

| Cluster                            | Ward   | Affected | Status     | Notes                              |
|------------------------------------|--------|----------|------------|------------------------------------|
| Drainage repair                    | Ward 7 | 340      | new        | Hackathon scenario 1. Gap: Community hall |
| Upper-primary school upgrade       | Ward 3 | 184      | forwarded  | Hackathon scenario 2. Dataset: enrollment |
| Sub-centre staffing & medicines    | Ward 9 | 210      | new        | Safety urgency, no office note yet |
| Drinking water supply              | Ward 12| 156      | forwarded  | Jal Board follow-up note           |
| All-weather road link              | Ward 5 | 132      | handling   | Highest relay share (61%)          |
| Evening power reliability          | Ward 14| 98       | info       | Lowest relay share (12%), urban    |
| Street lighting, school road       | Ward 7 | 88       | new        | Same ward as drainage — different category |
| Anganwadi centre renovation        | Ward 10| 74       | new        | High relay share                   |
| Overhead water tank                | Ward 11| 62       | new        | New colony, no infrastructure      |
| Girls' toilet block                | Ward 13| 56       | forwarded  | BEO escalated                      |
| Hand-pump restoration              | Ward 2 | 210      | published  | Showcase item 1                    |
| Community sanitation block         | Ward 8 | 156      | published  | Showcase item 2                    |
| Village access road                | Ward 1 | 320      | published  | Showcase item 3                    |

---

## 10. The Five Pages — What Each Does

### `/` — Dashboard (app/page.tsx → DashboardClient.tsx)
- **Server component** fetches `/api/clusters` at request time. Zero client-side fetch delay.
- Shows: 4 stat tiles (voices, themes, wards, relay %), priority themes ranked list,
  4 action bento tiles (yellow/green/coral/dark), demand gap alert (internal only),
  recent completed outcomes strip.
- Stagger animation: header → stats → bento → legend.

### `/submit` — Citizen & Relay Intake (app/submit/page.tsx)
- **Client component** ("use client"). Mode toggle: "For myself" / "For someone else".
- Relay mode shows extra fields: relay worker role + citizen locality.
- Live language detection pill as user types (detectLanguage inlined — spec §2.5 exception).
- VoiceButton: Web Speech API → fills textarea.
- On submit: POST to `/api/submit`. On success → Acknowledgment screen.
- Acknowledgment shows ONLY: checkmark, "Your voice has been heard", detected language,
  whether it joined existing demand. NO tracking ID, NO status, NO cluster ID — by design.

### `/mp` — MP Triage Tool (app/mp/page.tsx → MpTriageClient.tsx)
- **Server component** pre-fetches non-published clusters from backend. No client-side loading state.
- Card stack: top 3 cards mounted, rest queued. Drag gestures:
  - Right/fast flick → "Forwarded"
  - Left/fast flick → "Need info"
  - Up/fast flick → "Handling"
  - Tap "Mark complete & publish" → PublishModal
- Optimistic updates: card removed from deck immediately, PATCH fires async.
- Progress bar: "X actioned / Y remaining" (session-only, never persisted).
- PublishModal: requires 4+ char outcome text, shows live preview before confirm.

### `/showcase` — Public Showcase (app/showcase/page.tsx → ShowcaseClient.tsx)
- **Server component** fetches `/api/showcase` (published clusters only).
- Shows ONLY clusters where `status === "published"`. Nothing pending or in-progress.
- Each card: outcome line + "based on N residents in [locality]".
- Print button: `window.print()` for gram-sabha noticeboard. Button hides in print CSS.
- Impact strip: total outcomes published + total residents served.

### `/insights` — Judge / Technical View (app/insights/page.tsx → InsightsClient.tsx)
- **Server component** fetches `/api/clusters` (same endpoint as /mp, different rendering).
- HotspotMap: pure SVG, no external map library. Markers sized by `affected` count.
  Clicking a marker OR clicking a table row updates the same `selectedId` state.
- Detail panel shows full ScoreRationale breakdown (3 bars), + demographic data,
  + development plan data, + relay share, + sample quotes. All things NOT shown in /mp.
- Ranked table: all clusters including published (so full lifecycle is visible to judges).

---

## 11. PRD Feature Completion Status

### ✅ COMPLETE — Fully built and working

| Feature | PRD §  | Implementation location |
|---------|--------|------------------------|
| Self-submit text intake | 4.1.1 | frontend/app/submit/page.tsx |
| Relay-submit with worker role + locality | 4.1.2 | frontend/app/submit/page.tsx |
| Voice input (Web Speech API) | 4.1.1 | frontend/components/VoiceButton.tsx |
| Acknowledgment only — no tracking | 4.1.3, 4.10 | Acknowledgment component in submit page |
| Language auto-detection (6 scripts) | 4.2 | backend/src/ai/structure.ts |
| Category classification (keyword match) | 4.2 | backend/src/ai/structure.ts |
| Urgency detection (safety/high/normal) | 4.2 | backend/src/ai/structure.ts |
| Sentiment detection (4 bands) | 4.2 | backend/src/ai/structure.ts |
| Embedding + cosine similarity clustering | 4.3 | backend/src/ai/cluster.ts |
| Category pre-filter (no cross-category merge) | 4.3 | backend/src/ai/cluster.ts |
| Ward-match bonus in clustering | 4.3 | backend/src/ai/cluster.ts |
| Priority scoring (demand+urgency+data) | 4.4 | backend/src/ai/score.ts |
| Public dataset join at scoring time | 4.4 | backend/src/datasets.ts joinDataset() |
| Demographic dataset join (NEW) | §8.4 | backend/src/datasets.ts joinDemographics() |
| Development plan dataset join (NEW) | §8.5 | backend/src/datasets.ts lookupDevelopmentPlan() |
| Auto-populate sanctionedProject from plan | §1.4.2 | backend/src/store.ts + seed.ts |
| Score recalculates on every new submission | 4.4 | backend/src/store.ts submit() |
| MP triage card-stack | 4.5 | frontend/components/MpTriageClient.tsx + TriageCard.tsx |
| 3 positive actions (forward/handling/info) | 4.5 | TriageCard buttons + drag gestures |
| Status as colour dot, never day-count | 4.5 | frontend/components/ui.tsx StatusDot |
| Office note inline editor | 4.5 | TriageCard.tsx noteOpen state |
| Mark complete & publish with outcome text | 4.6 | PublishModal.tsx |
| Public showcase (completed only) | 4.6 | frontend/app/showcase/page.tsx |
| Outcome paired with demand count | 4.6 | ShowcaseClient ShowcaseCard |
| Print as gram-sabha noticeboard | 4.7 | showcase page + @media print CSS |
| Relay-submit as rural access path | 4.7 | submit/page.tsx relay mode |
| Geospatial hotspot map (SVG) | 4.8 | frontend/components/HotspotMap.tsx |
| Map markers sized by affected count | 4.8 | HotspotMap marker-sizing formula |
| Category color on map markers | 4.8 | CATEGORY_META from ui.tsx |
| Map + table in sync (same selectedId) | 4.8 | InsightsClient shared state |
| Demand-vs-sanctioned disclosure (internal) | 4.9 | TriageCard.tsx showInternal toggle |
| gapNote field defined on Cluster type | 4.9 | types.ts |
| No citizen tracking / day-count | 4.10 | Enforced by what Acknowledgment never renders |
| Aggregate stats (totalVoices, themes etc.) | 6.10 | backend/src/store.ts getStats() |
| Ranking: published sink to bottom | §4.5 | store.ts getClusters() comparator |
| Splash screen on first visit | UX | frontend/components/SplashScreen.tsx |
| Dark mode design (dark navy + amber) | UX | frontend/app/globals.css |
| Stagger entrance animations | UX | DashboardClient, motion variants |
| Monorepo backend/frontend split | §2 | backend/ + frontend/ folders |
| Frontend never imports backend | §2.5 | enforced via lib/api.ts |

---

### ⚠️ PARTIALLY BUILT — Working prototype, not production-grade

| Feature | PRD § | Current state | What's missing |
|---------|-------|---------------|----------------|
| AI structuring (category/urgency/sentiment) | 4.2 | Keyword regex match — works offline | Replace `backend/src/ai/structure.ts` with real Gemini/GPT structured-output call |
| Embeddings for clustering | 4.3 | Bag-of-words cosine similarity — works | Replace `embed()` in `backend/src/ai/cluster.ts` with real embeddings API call |
| Voice input reliability | 4.1.1 | Web Speech API — Chrome only, English-biased | Replace VoiceButton with Google Cloud Speech-to-Text for Indic language accuracy |
| HotspotMap geographic accuracy | 4.8 | Stylized 0–100 canvas, not real coordinates | Swap SVG for Leaflet/Mapbox, convert geo.x/y to real lat/lng |
| gapNote UI control | 4.9 | Field exists in types, no UI to set it | Add inline text input inside TriageCard's showInternal panel |
| Sentiment in scoring | §10.4 | Detected and stored, not weighted | Weight `distressed` submissions slightly higher in urgencyComponent |

---

### ❌ NOT YET BUILT — Specified but unimplemented

| Feature | PRD § | Why not built | How to implement |
|---------|-------|---------------|-----------------|
| Real database persistence | §10.1 | In-memory globalThis store (dev only) | Replace `backend/src/store.ts` internals with Firestore/PostgreSQL. All exported function signatures stay the same. |
| Multi-user concurrency | §10.7 | Single-process, no conflict resolution | Add optimistic locking or real-time Firestore subscriptions |
| USSD/IVR telecom integration | 4.7, §12 | Out of scope for hackathon | Build as post-pilot layer — existing relay-submit is the proxy |
| WhatsApp / SMS intake channel | §10 | Not specified for hackathon | New route in backend/src/server.ts → same submit() function |

---

### 🚫 EXPLICITLY OUT OF SCOPE (from PRD §12)

These must NEVER be built — they violate the design constraint:

- Any "unresolved issues" counter visible to anyone outside the MP's own tool
- Any MP report card or cross-constituency leaderboard
- Automated public disclosure (every showcase entry needs explicit MP approval)
- Persistent citizen-facing status tracking tied to individual submissions
- Any metric that could be screenshot and read as "MP failed to respond to X issues"

---

## 12. Design System (frontend/tailwind.config.ts + globals.css)

**Color palette (dark mode):**

| Token | Hex | Used for |
|-------|-----|---------|
| `#0D0F14` | night-900 | Page background |
| `#161A23` | night-800 | Card surfaces (.card class) |
| `#1E2330` | night-700 | Secondary surfaces, inputs |
| `#F5C518` | amber-500 | Primary CTA, active nav, score chips |
| `#4ADE80` | jade-400 | MP Triage action tile, handling status |
| `#F87171` | coral-400 | Showcase action tile, safety urgency |
| `rgba(255,255,255,0.07)` | — | Card borders, dividers |

**Typography:**
- `Inter` — body text (via `next/font/google`)
- `IBM Plex Mono` — numbers, scores, labels (`font-mono`)
- `Fraunces` — display serif headlines (`.display` class)

**CSS utility classes (defined in globals.css):**
- `.card` — dark surface with subtle border
- `.btn-accent` — amber CTA button
- `.btn-ghost` — ghost outline button
- `.btn-primary` — white button
- `.label` — monospace uppercase eyebrow text
- `.shimmer` — loading skeleton animation

---

## 13. Component Rules for AI Agents

When extending components:

1. **TriageCard** — Must ONLY show: category badge, status dot, title, locality, urgency, affected count, score integer, office note, action buttons. NEVER add: created date, day count, unresolved label, score rationale breakdown.

2. **Showcase cards** — Must show ONLY published items. Never add "pending" or "in progress" items here under any condition.

3. **ui.tsx** — The ONLY file that maps Category/ClusterStatus/Urgency values to colors, icons, labels. If adding a new category or status, edit ONLY this file — every page picks up automatically.

4. **HotspotMap** — Never embed in /mp. Judge view only. See §7.3 of architecture spec for full mechanics.

5. **Score/rationale** — Never render `rationale` on TriageCard or in any MP-facing surface. Only /insights renders it.

6. **Status dots** — Always use `<StatusDot />` from ui.tsx. Never write raw status text like "Pending" or "Unresolved" anywhere.

---

## 14. Adding New Features — Checklist

Before adding any feature, verify:
- [ ] Does it expose any metric that could read as "MP hasn't done X"? → Do NOT build it.
- [ ] Does frontend code import from backend/src/? → Refactor to use fetch() instead.
- [ ] Does new data go on the Cluster type? → Update BOTH backend/src/types.ts AND frontend/lib/types.ts.
- [ ] Does it add a new status value? → Check that it's not "pending", "overdue", or "unresolved".
- [ ] Does it modify store state? → Changes go in backend/src/store.ts ONLY. No other file mutates state.
- [ ] Does it add a new dataset? → Add rows to backend/src/datasets.ts. Extend ScoreRationale in types.ts.

---

## 15. Production Migration Path (when moving beyond hackathon)

Each swap is isolated — one file changes at a time:

| What to swap | File to change | All other files: untouched |
|---|---|---|
| In-memory → Firestore/PostgreSQL | `backend/src/store.ts` internals | Everything else |
| Keyword AI → Gemini structured output | `backend/src/ai/structure.ts` (make async) + `store.ts` (await the call) | Everything else |
| Bag-of-words → real embeddings | `backend/src/ai/cluster.ts` embed() body | Everything else |
| SVG map → real Leaflet/Mapbox | `frontend/components/HotspotMap.tsx` | Everything else |
| Web Speech → Google Cloud STT | `frontend/components/VoiceButton.tsx` | Everything else |
| Single server → Cloud Run | `backend/` deploys as container | Frontend points NEXT_PUBLIC_API_URL at the Cloud Run URL |
