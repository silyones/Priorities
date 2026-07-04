import { API_BASE } from "./api";

export const SUBMISSION_POST_TIMEOUT_MS = 120_000;

export type SubmissionPayload = {
  submittedFor: "myself" | "someone_else";
  name: string;
  role: string;
  locality: string;
  topic: string;
  description: string;
  imageBase64: string;
  // Present when on-device speech recognition wasn't available/working —
  // the backend transcribes it server-side and merges the result into the
  // saved description, so the citizen's own connectivity never has to hold
  // transcription up.
  audioBase64: string;
  latitude: number | null;
  longitude: number | null;
  phoneNumber?: string;
};

export async function saveSubmission(payload: SubmissionPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(SUBMISSION_POST_TIMEOUT_MS),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : typeof data.error === "string"
          ? data.error
          : "Could not save submission";
    throw new Error(detail);
  }
}
