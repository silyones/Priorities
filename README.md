<p align="center">
  <img src="icon/logo.png" alt="People's Priorities logo" width="280" />
</p>

<h1 align="center">People's Priorities</h1>

<p align="center"><em>Turn scattered citizen voices into ranked, actionable demand — for representatives who govern with evidence.</em></p>

---

## Overview

Constituencies generate thousands of local complaints — roads, drainage, water, schools — but they arrive as fragmented, unstructured noise. **People's Priorities** gives citizens a direct channel to report needs by voice, text, or photo, then uses AI to cluster similar reports into ranked themes so MPs and their staff can triage, act, and publish completed outcomes publicly.

The platform serves two audiences: **citizens** who submit and track local issues, and **MP office staff** who prioritize demand, manage workflows, and demonstrate accountability through a public showcase.

---

## Key Features

### Citizen experience

- **Multi-modal issue reporting** — submit by voice, text, or photo, with optional GPS location
- **Multi-language interface** — citizen-facing UI in Kannada, Hindi, English, Tamil, Telugu, Bengali, and more
- **Voice input via Sarvam AI** — server-side speech-to-text so citizens can report without typing

### Intelligence layer

- **AI issue classification and titling** — Google Gemini categorizes submissions and generates concise issue titles
- **Automatic issue grouping** — similar reports are merged into shared themes using semantic similarity, increasing signal strength as more citizens report the same problem
- **Issue brief analysis** — Groq-powered summaries, department recommendations, and urgency rationale for MP staff review

### MP office tools

- **Constituency dashboard** — live-ranked priority themes with voice counts, urgency, and locality context
- **Composite priority scoring** — themes ranked by demand, urgency, and recency
- **MP Triage** — card-based workflow to request information, mark handling, forward, or publish completed outcomes
- **Public Showcase** — MP-approved completed outcomes paired with the citizen demand that justified them
- **Insights & heatmap** — geographic demand visualization across Bengaluru using Google Maps and deck.gl, weighted by citizen voice count

### Platform

- **Issue lifecycle tracking** — persisted statuses from Open through Work in Progress to Completed, with subscriber opt-in for follow-up
- **Secure, production-grade practices** — sensitive MP operations gated behind server-side authentication; credentials never exposed to the browser

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Citizen & MP frontends** | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| **Backend API** | FastAPI (Python), Uvicorn |
| **Data** | Google Cloud Firestore, Firebase Admin SDK |
| **AI & language** | Google Gemini, Groq, Sarvam AI (speech-to-text) |
| **Maps & visualization** | Google Maps JavaScript API, deck.gl, `@react-google-maps/api` |
| **Runtime bridge** | TypeScript worker (Firebase Admin operations) |

---

## Screenshots / Demo

_Screenshots and a live demo link will be added here._

| View | Description |
|------|-------------|
| Citizen submit | Voice, text, and photo issue reporting |
| MP Dashboard | Live-ranked priority themes |
| MP Triage | Card-based theme actioning |
| Public Showcase | Published completed outcomes |
| Insights heatmap | Geographic demand visualization |

---

## Roadmap

- **Citizen notifications** — outbound SMS or WhatsApp alerts when issue status changes
- **Ward-level analytics** — demand vs. sanctioned development plan alignment views
- **Export & reporting** — printable constituency briefs and periodic outcome summaries
- **Relay worker mode** — field staff submission on behalf of citizens with full audit trail

---

## License

This project is licensed under the [MIT License](LICENSE).
