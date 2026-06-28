// Express server — thin HTTP adapters over lib/store.ts (spec §4.2, §4.6)
// No business logic lives here: parse → store → respond.

import express from "express";
import cors from "cors";
import { getClusters, getCluster, getShowcase, getStats, submit, actOnCluster } from "./store";

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

// ── POST /api/submit (spec §4.2.1) ──────────────────────────────────────────
app.post("/api/submit", (req, res) => {
  try {
    const { rawText, source, relayWorkerRole, locality } = req.body ?? {};
    if (!rawText?.trim()) {
      return res.status(400).json({ error: "Empty submission" });
    }
    const result = submit({
      rawText: rawText.trim(),
      source:  ["self", "relay"].includes(source) ? source : "self",
      relayWorkerRole,
      locality,
    });
    return res.json({
      ok:               true,
      acknowledgment:   "Your voice has been heard and recorded.",
      detectedLanguage: result.submission.structured.language,
      category:         result.cluster.category,
      joinedExisting:   result.joinedExisting,
      affected:         result.cluster.affected,
    });
  } catch {
    return res.status(400).json({ error: "Bad request" });
  }
});

// ── GET /api/clusters (spec §4.2.2) ─────────────────────────────────────────
app.get("/api/clusters", (_req, res) => {
  res.json({ clusters: getClusters(), stats: getStats() });
});

// ── PATCH /api/clusters/:id (spec §4.2.3) ───────────────────────────────────
app.patch("/api/clusters/:id", (req, res) => {
  try {
    const { status, officeNote, gapNote, publish } = req.body ?? {};
    const updated = actOnCluster(req.params.id, { status, officeNote, gapNote, publish });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, cluster: updated });
  } catch {
    return res.status(400).json({ error: "Bad request" });
  }
});

// ── GET /api/showcase (spec §4.2.4) ─────────────────────────────────────────
app.get("/api/showcase", (_req, res) => {
  res.json({ items: getShowcase() });
});

app.listen(PORT, () => {
  console.log(`\n  ▲ People's Priorities — Backend API`);
  console.log(`  → http://localhost:${PORT}/api/clusters\n`);
});

export default app;
