import {
  forwardBackendResponse,
  mpBackendHeaders,
  mpProxyConfigError,
  resolveBackendUrl,
} from "@/lib/server/mpBackendProxy";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const configError = mpProxyConfigError();
  if (configError) return configError;

  const issueId = params.id?.trim();
  if (!issueId) {
    return Response.json({ detail: "Issue id is required" }, { status: 400 });
  }

  const res = await fetch(
    `${resolveBackendUrl()}/api/issues/${encodeURIComponent(issueId)}/subscribers`,
    {
      method: "GET",
      headers: mpBackendHeaders(),
      cache: "no-store",
    },
  );

  return forwardBackendResponse(res);
}
