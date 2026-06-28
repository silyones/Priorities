import { NextRequest, NextResponse } from "next/server";
import { submit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = String(body.rawText ?? "").trim();
    if (!rawText) {
      return NextResponse.json({ error: "Empty submission" }, { status: 400 });
    }
    const result = submit({
      rawText,
      source: body.source === "relay" ? "relay" : "self",
      relayWorkerRole: body.relayWorkerRole,
      locality: body.locality,
    });
    // Citizen-facing response stays minimal by design (PRD 4.1.3): we return
    // structuring/cluster info for the demo console, but the UI shows only
    // an acknowledgment of receipt — never a status, timeline, or day-count.
    return NextResponse.json({
      ok: true,
      acknowledgment: "Your voice has been heard and recorded.",
      detectedLanguage: result.submission.structured.language,
      category: result.submission.structured.category,
      joinedExisting: result.joinedExisting,
      affected: result.cluster.affected,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
