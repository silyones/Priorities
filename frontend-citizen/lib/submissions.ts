import { API_BASE } from "./api";

export type SubmissionPayload = {
  submittedFor: "myself" | "someone_else";
  name: string;
  role: string;
  locality: string;
  topic: string;
  description: string;
  imageBase64: string;
  latitude: number | null;
  longitude: number | null;
};

export async function saveSubmission(payload: SubmissionPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Could not save submission");
  }
}
