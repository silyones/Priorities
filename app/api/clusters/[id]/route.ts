import { NextRequest, NextResponse } from "next/server";
import { actOnCluster } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = actOnCluster(params.id, {
      status: body.status,
      officeNote: body.officeNote,
      gapNote: body.gapNote,
      publish: body.publish,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, cluster: updated });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
