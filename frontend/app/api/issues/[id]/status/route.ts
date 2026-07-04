import {
  forwardBackendResponse,
  mpBackendHeaders,
  mpProxyConfigError,
  resolveBackendUrl,
} from "@/lib/server/mpBackendProxy";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const configError = mpProxyConfigError();
  if (configError) return configError;

  const issueId = params.id?.trim();
  if (!issueId) {
    return Response.json({ detail: "Issue id is required" }, { status: 400 });
  }

  const body = await request.text();

  const res = await fetch(
    `${resolveBackendUrl()}/api/issues/${encodeURIComponent(issueId)}/status`,
    {
      method: "PATCH",
      headers: mpBackendHeaders(true),
      body,
      cache: "no-store",
    },
  );

  return forwardBackendResponse(res);
}
