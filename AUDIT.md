# Priorities Repo Audit

Read-only audit of duplicate/dead folders. Date: 2026-06-29.

---

## 1. What `npm run dev` serves from the root

**Root `package.json` does not run the root-level Next.js app.** It runs a workspace orchestrator:

| Script | Command | What starts |
|--------|---------|-------------|
| `dev` | `concurrently "npm run dev:backend" "npm run dev:frontend"` | Both workspaces together |
| `dev:backend` | `cd backend && npm run dev` | Express API on **port 3001** (`ts-node-dev` → `backend/src/server.ts`) |
| `dev:frontend` | `cd frontend && npm run dev` | Next.js 14 on **port 3000** (`next dev -p 3000`) |

The browser app is **`http://localhost:3000`** → `frontend/`, not the root `app/` tree.

**Root `next.config.mjs` is unused** by `npm run dev`. Root `package.json` has no `next` dependency and no `next dev` script. Root-level `tsconfig.json`, `tailwind.config.ts`, and `postcss.config.mjs` target a second, legacy Next.js layout at the repo root that is not wired into the current dev workflow.

---

## 2. `backend/` — separate project, actively used

`backend/` is **not** a Next.js app. It is a standalone **Express + TypeScript** API:

- Own `package.json`, `package-lock.json`, `tsconfig.json`
- Entry: `backend/src/server.ts` (port 3001)
- Routes: `POST /api/submit`, `GET /api/clusters`, `PATCH /api/clusters/:id`, `GET /api/showcase`
- Business logic: `backend/src/store.ts`, `seed.ts`, `datasets.ts`, `ai/*`, `types.ts`

**Not imported** by root `app/`, `components/`, or `lib/`. No cross-folder TypeScript imports (`../app`, `@/lib`, etc.) from `backend/`.

**Used at runtime** by `frontend/` via HTTP (`frontend/lib/api.ts` → `NEXT_PUBLIC_API_URL`, default `http://localhost:3001`). This matches `README.md` and is started by root `npm run dev`.

**Verdict:** Live, intentional API server — **not dead code**. It duplicates the logic in root `lib/` (same domain model and store pattern), but that duplication is architectural (split API vs monolith), not an accident inside `backend/` itself.

---

## 3. `frontend/` — the live Next.js app; root does not import it

`frontend/` is a full Next.js 14 workspace with its own `app/`, `components/`, `lib/`, configs, and `node_modules` (hoisted via npm workspaces).

- All `@/` imports resolve **inside `frontend/`** (`"@/*": ["./*"]` in `frontend/tsconfig.json`).
- **No imports** from root `app/`, `components/`, or `lib/`.
- Pages fetch data from the Express backend (`API_BASE`), not from a local `lib/store.ts` (frontend has no store).

`frontend/` is a near-copy of root `app/` + `components/` with one important difference: **client/server data access goes through the backend API**, whereas the root tree reads `lib/store` directly and exposes `app/api/*` Route Handlers.

**Verdict:** **Active, canonical UI** per README and root dev scripts. Root-level `app/` + `components/` are the **legacy monolith copy**, not the other way around.

---

## 4. Root `app/` — routes, API, and what uses `components/` and `lib/`

### Routes (pages)

| Route | File | Renders |
|-------|------|---------|
| `/` | `app/page.tsx` | Dashboard — `getClusters()` / `getStats()` from `lib/store` → `DashboardClient` |
| `/submit` | `app/submit/page.tsx` | Citizen/relay intake form (voice + text); `detectLanguage` from `lib/ai/structure` |
| `/mp` | `app/mp/page.tsx` | MP triage card-stack → `MpTriageClient` |
| `/showcase` | `app/showcase/page.tsx` | Published outcomes → `ShowcaseClient` |
| `/insights` | `app/insights/page.tsx` | Judge/technical view (map + scoring) → `InsightsClient` |
| (global) | `app/layout.tsx` | Fonts, `globals.css`, `SplashScreen`, `SiteNav`, `<main>` |
| (global) | `app/loading.tsx` | Branded loading spinner |

Same five user-facing routes exist under `frontend/app/` with equivalent UI but **API-backed** data loading.

### API routes (root only — no equivalent in `frontend/`)

| Route | File | Purpose |
|-------|------|---------|
| `POST /api/submit` | `app/api/submit/route.ts` | Submission ingestion via `lib/store.submit` |
| `GET /api/clusters` | `app/api/clusters/route.ts` | Clusters + stats |
| `PATCH /api/clusters/[id]` | `app/api/clusters/[id]/route.ts` | MP triage actions |
| `GET /api/showcase` | `app/api/showcase/route.ts` | Published showcase items |

These mirror `backend/src/server.ts` endpoints. Root `MpTriageClient` PATCHes `/api/clusters/:id` (relative, same-origin); `frontend` PATCHes `${API_BASE}/api/clusters/:id`.

### `components/` (root)

Shared UI for the legacy root Next app. **Used by `app/`:**

| Component | Used by |
|-----------|---------|
| `SiteNav`, `SplashScreen`, `Logo` | `app/layout.tsx` / nav |
| `DashboardClient` | `app/page.tsx` |
| `VoiceButton`, `motion` (`Reveal`) | `app/submit/page.tsx` |
| `MpTriageClient` | `app/mp/page.tsx` |
| `ShowcaseClient` | `app/showcase/page.tsx` |
| `InsightsClient` | `app/insights/page.tsx` |
| `TriageCard`, `PublishModal`, `ui`, `HotspotMap` | Composed by the clients above |

**Present but not imported anywhere:** `HeroBackground.tsx`, `PipelineFlow.tsx`, `SiteFooter.tsx` (dead in both root and `frontend/components/`).

### `lib/` (root)

In-memory domain + AI pipeline for the **monolithic** architecture:

| Module | Role |
|--------|------|
| `types.ts` | Domain types (`Cluster`, `Submission`, categories, statuses) |
| `store.ts` | Single mutator; seed data; submit/cluster/score pipeline; used by all root pages and API routes |
| `seed.ts` | 13 mock clusters |
| `datasets.ts` | Public/demographic/plan datasets joined at scoring time |
| `ai/structure.ts` | Classify submissions; `detectLanguage` exported for submit UX |
| `ai/cluster.ts` | Embedding + theme matching |
| `ai/score.ts` | Priority scoring |

**Verdict on root `app/` + `components/` + `lib/`:** Functionally complete alternate stack (Next.js full-stack monolith). **Not served** by current root `npm run dev`. Duplicates `backend/src/*` (lib) and `frontend/*` (UI).

---

## 5. Duplication map

```
                    ┌─────────────────────────────────────┐
  npm run dev  ──►  │  backend/ (Express, :3001)          │  ◄── HTTP ── frontend/ (Next, :3000)
                    └─────────────────────────────────────┘
                                      ≈ duplicate logic
                    ┌─────────────────────────────────────┐
  NOT started  ──►  │  root lib/ + app/api/*              │
                    └─────────────────────────────────────┘
                                      ≈ duplicate UI
                    ┌─────────────────────────────────────┐
  NOT started  ──►  │  root app/ + components/            │
                    └─────────────────────────────────────┘
```

| Root (legacy monolith) | Active workspace equivalent |
|------------------------|----------------------------|
| `lib/*` | `backend/src/*` |
| `app/api/*` | `backend/src/server.ts` |
| `app/*`, `components/*` | `frontend/app/*`, `frontend/components/*` |
| `lib/types.ts` | `backend/src/types.ts` + `frontend/lib/types.ts` (copy) |
| — | `frontend/lib/api.ts` (HTTP client; no monolith equivalent) |

Orphaned root config (leftover from when Next lived at repo root): `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs` (no root `next-env.d.ts`; only `frontend/next-env.d.ts` exists).

---

## Recommendation

**Fold into the monorepo plan:** Treat **`backend/`** and **`frontend/`** as the two canonical packages. Root `package.json` workspaces + `concurrently` dev script already match `README.md`; keep that as the orchestration layer and add shared tooling (lint, types sync) there rather than reviving the root Next app.

**Safe to delete after you pick one architecture (and merge any unique diffs):** Root **`app/`**, **`components/`**, **`lib/`**, and the orphaned root Next/Tailwind configs (`next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`). These are a superseded full-stack Next monolith; nothing in the live dev path imports them. Before deletion, diff root vs `frontend`/`backend` for any edits made only on the root copy (e.g. root `MpTriageClient` uses relative `/api/...` instead of `API_BASE`).

**Do not delete:** **`backend/`** or **`frontend/`** — they are what `npm run dev` actually runs. **`node_modules/`** at root is workspace hoisting, not a duplicate app.

**Optional cleanup (low risk):** Remove unused `HeroBackground`, `PipelineFlow`, and `SiteFooter` from both trees once you consolidate to a single `components/` location.
