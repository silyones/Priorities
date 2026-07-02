import { fetchWithTimeout } from "@/lib/api";
import type { Category, Cluster, Urgency } from "@/lib/types";

export interface ApiSubmission {
  id: string;
  topic: string;
  description: string;
  issueType: string;
  severity: string;
  locality: string;
  submittedFor: string;
  createdAt: string | null;
}

function severityToUrgency(severity: string): Urgency {
  if (severity === "Safety risk") return "safety";
  if (severity === "High priority") return "high";
  return "normal";
}

function issueTypeToCategory(issueType: string): Category {
  const map: Record<string, Category> = {
    Sanitation: "sanitation",
    Drainage: "sanitation",
    Roads: "roads",
    "Water Supply": "water",
    Electricity: "electricity",
  };
  return map[issueType] ?? "other";
}

function urgencyScore(urgency: Urgency): number {
  if (urgency === "safety") return 90;
  if (urgency === "high") return 70;
  return 50;
}

export function submissionToTheme(submission: ApiSubmission): Cluster {
  const urgency = severityToUrgency(submission.severity ?? "");
  const title = submission.topic?.trim() || submission.description?.trim().slice(0, 80) || "Untitled submission";

  return {
    id: submission.id,
    title,
    category: issueTypeToCategory(submission.issueType ?? ""),
    ward: "",
    locality: submission.locality?.trim() || "Unknown area",
    affected: 1,
    urgency,
    status: "new",
    score: urgencyScore(urgency),
    isLiveSubmission: true,
    rationale: {
      demandComponent: 0,
      urgencyComponent: 0,
      dataComponent: 0,
    },
    geo: { x: 50, y: 50 },
    sampleQuotes: [submission.description ?? ""],
    relayShare: submission.submittedFor === "someone_else" ? 1 : 0,
  };
}

export type SubmissionsFetchResult =
  | { ok: true; submissions: ApiSubmission[] }
  | { ok: false; error: string };

export async function fetchSubmissions(): Promise<SubmissionsFetchResult> {
  try {
    const res = await fetchWithTimeout("/api/submissions", { cache: "no-store" });
    const body = await res.text();

    if (!res.ok) {
      console.error(
        `[submissions] GET /api/submissions failed: ${res.status}`,
        body,
      );
      return {
        ok: false,
        error: `Failed to fetch submissions (${res.status})`,
      };
    }

    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      console.error("[submissions] GET /api/submissions returned invalid JSON:", body);
      return { ok: false, error: "Invalid submissions response" };
    }

    return { ok: true, submissions: Array.isArray(data) ? data : [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not fetch submissions";
    console.error("[submissions] fetch error:", message);
    return { ok: false, error: message };
  }
}

export function isLiveSubmissionCluster(cluster: Cluster): boolean {
  return cluster.isLiveSubmission === true;
}

export async function fetchSubmissionThemes(): Promise<{
  themes: Cluster[];
  error: string | null;
}> {
  const result = await fetchSubmissions();
  if (!result.ok) {
    return { themes: [], error: result.error };
  }
  return {
    themes: result.submissions.map(submissionToTheme),
    error: null,
  };
}
