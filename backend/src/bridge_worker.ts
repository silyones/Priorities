// Long-lived worker: one JSON request per line on stdin, one JSON response per line on stdout.

import "dotenv/config";
import fs from "fs";
import fsPromises from "fs/promises";
import readline from "readline";
import { saveSubmissionToFirestore } from "./submissions";
import {
  getSubmissionById,
  getSubmissionImage,
  listSubmissions,
  listSubmissionsInternal,
} from "./submission_queries";
import {
  attachSubmissionToIssue,
  countIssues,
  createIssue,
  createIssueFromGroup,
  getIssueById,
  listIssueSubscribers,
  listIssues,
  listIssuesByIssueType,
  updateIssueStatus,
} from "./issue_queries";
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
    case "firestore:get": {
      const id = request.id?.trim();
      if (!id) throw new Error("Submission id is required");
      const submission = await getSubmissionById(id);
      if (!submission) throw new Error("Submission not found");
      return { ok: true, result: submission };
    }
    case "firestore:listInternal": {
      const result = await listSubmissionsInternal();
      return { ok: true, result };
    }
    case "issues:listByType": {
      const issueType =
        typeof request.payload?.issueType === "string"
          ? request.payload.issueType
          : "";
      const result = await listIssuesByIssueType(issueType);
      return { ok: true, result };
    }
    case "issues:list": {
      const result = await listIssues();
      return { ok: true, result };
    }
    case "themes:listSource": {
      const [issues, submissions] = await Promise.all([
        listIssues(),
        listSubmissions(),
      ]);
      return { ok: true, result: { issues, submissions } };
    }
    case "issues:count": {
      const result = await countIssues();
      return { ok: true, result };
    }
    case "issues:get": {
      const id = request.id?.trim();
      if (!id) throw new Error("Issue id is required");
      const issue = await getIssueById(id);
      if (!issue) throw new Error("Issue not found");
      return { ok: true, result: issue };
    }
    case "issues:create": {
      const payload = request.payload ?? {};
      const result = await createIssue({
        issueType: String(payload.issueType ?? ""),
        repTopic: String(payload.repTopic ?? ""),
        repDescription: String(payload.repDescription ?? ""),
        repLocality: String(payload.repLocality ?? ""),
        repSubmissionId: String(payload.repSubmissionId ?? ""),
        submissionId: String(payload.submissionId ?? ""),
        phoneNumber:
          typeof payload.phoneNumber === "string" && payload.phoneNumber.trim()
            ? payload.phoneNumber.trim()
            : undefined,
        aiTitle:
          typeof payload.aiTitle === "string" && payload.aiTitle.trim()
            ? payload.aiTitle.trim()
            : undefined,
      });
      return { ok: true, result };
    }
    case "issues:attach": {
      const payload = request.payload ?? {};
      const issueId = String(payload.issueId ?? "").trim();
      const submissionId = String(payload.submissionId ?? "").trim();
      if (!issueId || !submissionId) throw new Error("issueId and submissionId are required");
      const result = await attachSubmissionToIssue({
        issueId,
        submissionId,
        phoneNumber:
          typeof payload.phoneNumber === "string" && payload.phoneNumber.trim()
            ? payload.phoneNumber.trim()
            : undefined,
      });
      return { ok: true, result };
    }
    case "issues:subscribers": {
      const id = request.id?.trim();
      if (!id) throw new Error("Issue id is required");
      const result = await listIssueSubscribers(id);
      return { ok: true, result };
    }
    case "issues:updateStatus": {
      const id = request.id?.trim();
      if (!id) throw new Error("Issue id is required");
      const payload = request.payload ?? {};
      const status = String(payload.status ?? "").trim();
      if (!status) throw new Error("status is required");
      const result = await updateIssueStatus({
        issueId: id,
        status,
        lastNotifiedStatus:
          payload.lastNotifiedStatus === null
            ? null
            : typeof payload.lastNotifiedStatus === "string"
              ? payload.lastNotifiedStatus
              : undefined,
      });
      return { ok: true, result };
    }
    case "issues:migrateCreate": {
      const payload = request.payload ?? {};
      const id = await createIssueFromGroup({
        issueType: String(payload.issueType ?? ""),
        repTopic: String(payload.repTopic ?? ""),
        repDescription: String(payload.repDescription ?? ""),
        repLocality: String(payload.repLocality ?? ""),
        repSubmissionId: String(payload.repSubmissionId ?? ""),
        submissionIds: Array.isArray(payload.submissionIds)
          ? payload.submissionIds.map(String)
          : [],
        phoneNumbers: Array.isArray(payload.phoneNumbers)
          ? payload.phoneNumbers.map(String)
          : [],
        aiTitle:
          typeof payload.aiTitle === "string" && payload.aiTitle.trim()
            ? payload.aiTitle.trim()
            : undefined,
      });
      return { ok: true, result: { id } };
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
