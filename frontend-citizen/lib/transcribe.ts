import { API_BASE } from "./api";

export type TranscribeResponse = {
  ok: boolean;
  transcript: string;
  languageCode: string | null;
};

export async function transcribeSpeech(audio: Blob): Promise<TranscribeResponse> {
  const ext = audio.type.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("file", audio, `recording.${ext}`);

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    // FastAPI's HTTPException serializes errors as { detail: "..." },
    // not { error: "..." } — read the field the backend actually sends.
    throw new Error(data.detail ?? data.error ?? "Could not transcribe audio");
  }
  return data;
}
