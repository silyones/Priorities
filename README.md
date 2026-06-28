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

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure environment

The frontend needs to know where the backend is. A default `.env.local` is already
included in `frontend/`. It points to `http://localhost:3001` (the default backend port).

If you change the backend port, edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Start both servers

Open **two terminal windows**:

**Terminal 1 — Backend (Express API)**
```bash
cd backend
npm run dev
# Starts on http://localhost:3001
```

**Terminal 2 — Frontend (Next.js)**
```bash
cd frontend
npm run dev
# Starts on http://localhost:3000
```

### 5. Open the app

Go to **http://localhost:3000** in your browser.

> The app loads with 13 realistic mock clusters covering all categories, statuses, and
> wards. No database or external API keys are needed to run it.

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
├── frontend/                  ← Next.js 14 app (port 3000)
│   ├── app/
│   │   ├── page.tsx           Dashboard — ranked themes + stats
│   │   ├── submit/page.tsx    Citizen & relay intake form
│   │   ├── mp/page.tsx        MP triage card-stack
│   │   ├── showcase/page.tsx  Public showcase of completed work
│   │   └── insights/page.tsx  Judge / technical view (map + scoring)
│   ├── components/            UI components
│   ├── lib/
│   │   ├── types.ts           Frontend copy of domain types
│   │   └── api.ts             All API calls go through here
│   ├── .env.local             NEXT_PUBLIC_API_URL=http://localhost:3001
│   └── package.json
│
├── TASKS.md                   Full feature status, architecture guide, AI agent rules
└── README.md                  This file
```

---

## The Four Surfaces

| Route | Who uses it | What it shows |
|-------|-------------|---------------|
| `/` | MP office / anyone | Live dashboard — ranked demand themes, stats |
| `/submit` | Citizens & relay workers | Voice or text submission form (multilingual) |
| `/mp` | MP office staff | Triage card-stack — swipe to action themes |
| `/showcase` | General public | Completed, MP-approved outcomes only |
| `/insights` | Hackathon judges / technical | Hotspot map, scoring breakdown, full data |

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

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
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
