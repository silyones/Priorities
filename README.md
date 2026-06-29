# People's Priorities

> AI for Constituency Development Planning  
> Google Cloud × Hack2skill — Track 01

A multilingual AI platform that turns scattered citizen voices into a ranked, data-backed picture of what a constituency actually needs — and makes acting on it nearly effortless for an MP's office.

---

## Prerequisites

Make sure you have these installed before starting:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18 or higher | `node -v` |
| npm | 8 or higher | `npm -v` |
| Git | any | `git --version` |

---

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/viki22uied/Priorities.git
cd Priorities
```

### 2. Install dependencies

From the repo root (npm workspaces installs all three packages):

```bash
npm install
```

### 3. Configure environment

Both frontends need the backend URL. Copy the examples and edit if needed:

```bash
cp frontend-citizen/.env.example frontend-citizen/.env.local
cp frontend/.env.example frontend/.env.local
```

```env
# frontend-citizen/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MP_APP_URL=http://localhost:3002

# frontend/.env.local (MP app)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Start all three servers

**Option A — one command from the repo root (recommended):**

```bash
npm run dev    # backend :3001 + citizen :3000 + MP :3002
```

**Option B — three terminal windows:**

| Terminal | Command | URL |
|----------|---------|-----|
| Backend | `cd backend && npm run dev` | http://localhost:3001 |
| Citizen app | `cd frontend-citizen && npm run dev` | http://localhost:3000 |
| MP app | `cd frontend && npm run dev` | http://localhost:3002 |

Individual scripts from root: `npm run dev:backend`, `npm run dev:citizen`, `npm run dev:mp`.

### 5. Open the apps

| App | URL | Who uses it |
|-----|-----|-------------|
| **Citizen** | http://localhost:3000 | Citizens & relay workers — submit voices |
| **MP office** | http://localhost:3002 | Dashboard, triage, showcase, insights |
| **API** | http://localhost:3001 | Express backend (not browsed directly) |

> The MP app loads with 13 realistic mock clusters. No database or external API keys are needed.

---

## Project Structure

```
Priorities/
├── backend/                   ← Express.js API server (port 3001)
│   ├── src/
│   │   ├── types.ts           Domain model — single source of truth
│   │   ├── store.ts           Only file allowed to mutate data
│   │   ├── seed.ts            13 mock clusters (realistic constituency data)
│   │   ├── datasets.ts        Public + demographic + development plan datasets
│   │   ├── server.ts          4 Express routes (thin HTTP adapters)
│   │   └── ai/
│   │       ├── structure.ts   Classifies submissions: category, urgency, language
│   │       ├── cluster.ts     Groups similar submissions into themes
│   │       └── score.ts       Priority scoring (demand + urgency + public data)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend-citizen/          ← Citizen Next.js app (port 3000)
│   ├── app/
│   │   ├── page.tsx           Placeholder home (Phase 4)
│   │   └── submit/page.tsx    Citizen & relay intake form
│   ├── components/            Logo, SiteNav, VoiceButton, ui/Tag, motion
│   ├── lib/api.ts             API_BASE + MP_APP_URL for cross-links
│   └── package.json
│
├── frontend/                  ← MP office Next.js app (port 3002)
│   ├── app/
│   │   ├── page.tsx           Dashboard — ranked themes + stats
│   │   ├── mp/page.tsx        MP triage card-stack
│   │   ├── showcase/page.tsx  Public showcase of completed work
│   │   └── insights/page.tsx  Judge / technical view (map + scoring)
│   ├── components/            MP-specific UI (DashboardClient, TriageCard, …)
│   ├── lib/
│   │   ├── types.ts           Frontend copy of domain types
│   │   └── api.ts             All API calls go through here
│   ├── .env.local             NEXT_PUBLIC_API_URL=http://localhost:3001
│   └── package.json
│
├── package.json               Workspace root (`npm run dev` starts all three)
├── package-lock.json
├── TASKS.md                   Full feature status, architecture guide, AI agent rules
└── README.md                  This file
```

---

## The Surfaces

| Route | App | Port | Who uses it |
|-------|-----|------|-------------|
| `/` | Citizen | 3000 | Placeholder home (Phase 4) |
| `/submit` | Citizen | 3000 | Citizens & relay workers — voice or text submission |
| `/` | MP | 3002 | Live dashboard — ranked demand themes, stats |
| `/mp` | MP | 3002 | MP office staff — triage card-stack |
| `/showcase` | MP | 3002 | General public — completed, MP-approved outcomes |
| `/insights` | MP | 3002 | Hackathon judges / technical — hotspot map, scoring |

---

## API Routes (Backend)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/submit` | Submit a citizen or relay voice |
| `GET` | `/api/clusters` | All clusters ranked by priority score + stats |
| `PATCH` | `/api/clusters/:id` | MP triage action (forward / handling / info / publish) |
| `GET` | `/api/showcase` | Published outcomes only |

---

## Tech Stack

**Backend**
- Node.js + Express
- TypeScript
- In-memory store (swappable to Firestore / PostgreSQL — see TASKS.md §15)

**Frontends**
- Next.js 14 (App Router) × 2 — citizen + MP
- TypeScript
- Tailwind CSS (cream / black / rust design tokens)
- Framer Motion
- Lucide icons

---

## Key Design Rule

> No surface, field, or metric in this system may read as a failure metric.  
> No day-counts. No backlog numbers. No "MP responded to X% of issues".  
> Every number is a record of action taken — never inaction.

See `TASKS.md` for the full feature checklist, architecture rules, and production migration guide.

---

## Contributing / Extending

Before making changes, read **`TASKS.md`** — it explains every file, lists what's complete vs pending,
and has a checklist every new feature must pass before being added.
