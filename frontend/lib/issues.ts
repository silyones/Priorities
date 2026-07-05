import { fetchWithTimeout } from "@/lib/api";

export type PersistedIssueStatus = "Open" | "Work in Progress" | "Completed";

export interface IssueVoice {
  id: string;
  topic: string;
  description: string;
}

export interface IssueDetail {
  id: string;
  repSubmissionId: string;
  aiTitle: string;
  topic: string;
  description: string;
  voices: IssueVoice[];
  issueType: string;
  severity: string;
  locality: string;
  submittedFor: string;
  name: string;
  role: string;
  aiTags: string[];
  latitude: number | null;
  longitude: number | null;
  hasImage: boolean;
  createdAt: string | null;
  affected: number;
  subscriberCount: number;
  issueStatus: PersistedIssueStatus;
  submissionIds: string[];
  sampleQuotes: string[];
}

export interface IssueSubscriber {
  phoneNumber: string;
  firstReportedAt: string | null;
}

export async function fetchIssueDetail(
  issueId: string,
): Promise<{ ok: true; issue: IssueDetail } | { ok: false; error: string }> {
  try {
    const res = await fetchWithTimeout(`/api/issues/${encodeURIComponent(issueId)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.status === 404 ? "Issue not found" : `Failed to load issue (${res.status})`,
      };
    }
    const issue = (await res.json()) as IssueDetail;
    return { ok: true, issue };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load issue";
    return { ok: false, error: message };
  }
}

export async function fetchIssueSubscribers(
  issueId: string,
): Promise<{ ok: true; subscribers: IssueSubscriber[] } | { ok: false; error: string }> {
  try {
    const res = await fetchWithTimeout(
      `/api/issues/${encodeURIComponent(issueId)}/subscribers`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return { ok: false, error: `Failed to load subscribers (${res.status})` };
    }
    const subscribers = (await res.json()) as IssueSubscriber[];
    return { ok: true, subscribers: Array.isArray(subscribers) ? subscribers : [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load subscribers";
    return { ok: false, error: message };
  }
}

export async function patchIssueStatus(
  issueId: string,
  status: PersistedIssueStatus,
  options?: { outcome?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const body: { status: PersistedIssueStatus; outcome?: string } = { status };
    if (options?.outcome !== undefined) {
      body.outcome = options.outcome;
    }

    const res = await fetchWithTimeout(
      `/api/issues/${encodeURIComponent(issueId)}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detail = typeof body.detail === "string" ? body.detail : `Update failed (${res.status})`;
      return { ok: false, error: detail };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update status";
    return { ok: false, error: message };
  }
}

export const ISSUE_STATUS_OPTIONS: PersistedIssueStatus[] = [
  "Work in Progress",
  "Completed",
];

export function issueStatusLabel(status: string): string {
  if (status === "Work in Progress") return "Work in Progress";
  if (status === "Completed") return "Completed";
  return "Open";
}
