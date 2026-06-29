// Express server — thin HTTP adapters over lib/store.ts (spec §4.2, §4.6)
// No business logic lives here: parse → store → respond.

import "dotenv/config"; // loads backend/.env (SARVAM_API_KEY, etc.)
import express from "express";
import cors from "cors";
import multer from "multer";
import { getClusters, getCluster, getShowcase, getStats, submit, actOnCluster } from "./store";
import { transcribeAudio } from "./sarvam";

const app  = express();
const PORT = process.env.PORT ?? 3001;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

// ── POST /api/transcribe (Sarvam Saaras v3 STT) ─────────────────────────────
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const result = await transcribeAudio(
      req.file.buffer,
      req.file.mimetype || "audio/webm",
      req.file.originalname || "recording.webm",
    );

    return res.json({
      ok: true,
      transcript: result.transcript,
      languageCode: result.language_code,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    const status = message.includes("SARVAM_API_KEY") ? 503 : 422;
    return res.status(status).json({ error: message });
  }
});

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
