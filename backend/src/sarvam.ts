// Sarvam Saaras v3 speech-to-text (REST) — transcribe in the spoken language.

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

export type SarvamTranscribeResult = {
  transcript: string;
  language_code: string | null;
  request_id: string;
};

export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
  filename: string,
): Promise<SarvamTranscribeResult> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY is not configured on the server");
  }

  const form = new FormData();
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), filename);

  const res = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: form,
  });

  const body = (await res.json()) as {
    transcript?: string;
    language_code?: string | null;
    request_id?: string;
    error?: { message?: string; code?: string };
    message?: string;
  };

  if (!res.ok) {
    const detail =
      body.error?.message ?? body.message ?? `Sarvam STT failed (${res.status})`;
    throw new Error(detail);
  }

  if (!body.transcript?.trim()) {
    throw new Error("No speech detected. Try speaking again.");
  }

  return {
    transcript: body.transcript.trim(),
    language_code: body.language_code ?? null,
    request_id: body.request_id ?? "",
  };
}
