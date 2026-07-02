// All frontend API calls go through here — never import backend lib/ directly (spec §2.5)
// Set NEXT_PUBLIC_API_URL in .env.local to point at the backend server.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const FETCH_TIMEOUT_MS = 30_000;
export const SUBMISSION_POST_TIMEOUT_MS = 120_000;

export async function fetchWithTimeout(
  path: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
