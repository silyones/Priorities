/**
 * Server-only helpers for Next.js route handlers that proxy MP-gated FastAPI calls.
 * Do not import from client components — MP_API_SECRET must never reach the browser bundle.
 */

export function resolveBackendUrl(): string {
  const base =
    process.env.BACKEND_URL?.trim() ||
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    "http://127.0.0.1:3001";
  return base.replace(/\/$/, "");
}

export function resolveMpApiSecret(): string | null {
  const secret = process.env.MP_API_SECRET?.trim();
  return secret || null;
}

export function mpBackendHeaders(json = false): Headers {
  const headers = new Headers();
  const secret = resolveMpApiSecret();
  if (secret) {
    headers.set("X-MP-API-Key", secret);
  }
  if (json) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export function mpProxyConfigError(): Response | null {
  if (!resolveMpApiSecret()) {
    return Response.json(
      { detail: "MP_API_SECRET is not configured on the Next.js server" },
      { status: 503 },
    );
  }
  return null;
}

export async function forwardBackendResponse(res: Response): Promise<Response> {
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
