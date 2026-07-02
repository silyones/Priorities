// Long-lived worker: one JSON request per line on stdin, one JSON response per line on stdout.

import "dotenv/config";
import fs from "fs";
import fsPromises from "fs/promises";
import readline from "readline";
import { saveSubmissionToFirestore } from "./submissions";
import { getSubmissionImage, listSubmissions } from "./submission_queries";
import { actOnCluster, getClusters, getShowcase, getStats, submit } from "./store";

type BridgeRequest = {
  action?: string;
  payload?: Record<string, unknown>;
  payloadPath?: string;
  id?: string;
};

function writeResponse(data: unknown) {
  fs.writeSync(1, `${JSON.stringify(data)}\n`);
}

async function handleRequest(request: BridgeRequest) {
  switch (request.action) {
    case "firestore:save": {
      let payload = request.payload;
      if (request.payloadPath) {
        const raw = await fsPromises.readFile(request.payloadPath, "utf8");
        payload = JSON.parse(raw) as Record<string, unknown>;
        await fsPromises.unlink(request.payloadPath).catch(() => undefined);
      }
      if (!payload) throw new Error("Missing submission payload");
      const result = await saveSubmissionToFirestore(payload as never);
      return { ok: true, result };
    }
    case "firestore:list": {
      const result = await listSubmissions();
      return { ok: true, result };
    }
    case "firestore:image": {
      const id = request.id?.trim();
      if (!id) throw new Error("Submission id is required");
      const imageBase64 = await getSubmissionImage(id);
      return { ok: true, result: { imageBase64 } };
    }
    case "store:clusters": {
      return { ok: true, result: { clusters: getClusters(), stats: getStats() } };
    }
    case "store:showcase": {
      return { ok: true, result: { items: getShowcase() } };
    }
    case "store:submit": {
      const payload = request.payload ?? {};
      const rawText = typeof payload.rawText === "string" ? payload.rawText : "";
      if (!rawText.trim()) throw new Error("Empty submission");
      const source = payload.source === "relay" ? "relay" : "self";
      const result = submit({
        rawText: rawText.trim(),
        source,
        relayWorkerRole:
          typeof payload.relayWorkerRole === "string"
            ? payload.relayWorkerRole
            : undefined,
        locality: typeof payload.locality === "string" ? payload.locality : undefined,
      });
      return {
        ok: true,
        result: {
          ok: true,
          acknowledgment: "Your voice has been heard and recorded.",
          detectedLanguage: result.submission.structured.language,
          category: result.cluster.category,
          joinedExisting: result.joinedExisting,
          affected: result.cluster.affected,
        },
      };
    }
    case "store:actOnCluster": {
      const id = request.id?.trim();
      if (!id) throw new Error("Cluster id is required");
      const payload = request.payload ?? {};
      const updated = actOnCluster(id, {
        status: payload.status as Parameters<typeof actOnCluster>[1]["status"],
        officeNote:
          typeof payload.officeNote === "string" ? payload.officeNote : undefined,
        gapNote: typeof payload.gapNote === "string" ? payload.gapNote : undefined,
        publish:
          payload.publish &&
          typeof payload.publish === "object" &&
          payload.publish !== null &&
          typeof (payload.publish as { outcome?: unknown }).outcome === "string"
            ? { outcome: (payload.publish as { outcome: string }).outcome }
            : undefined,
      });
      if (!updated) throw new Error("Not found");
      return { ok: true, result: { ok: true, cluster: updated } };
    }
    case "ping":
      return { ok: true, result: "pong" };
    default:
      throw new Error(`Unknown bridge action: ${request.action ?? "(missing)"}`);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

let processing = false;
const pending: string[] = [];

async function drainQueue() {
  if (processing) return;
  processing = true;

  while (pending.length > 0) {
    const line = pending.shift();
    if (!line) continue;

    try {
      const request = JSON.parse(line) as BridgeRequest;
      writeResponse(await handleRequest(request));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bridge request failed";
      writeResponse({ ok: false, error: message });
    }
  }

  processing = false;
}

rl.on("line", (line) => {
  pending.push(line);
  void drainQueue();
});

rl.on("close", () => {
  process.exit(0);
});
