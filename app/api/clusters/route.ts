import { NextResponse } from "next/server";
import { getClusters, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ clusters: getClusters(), stats: getStats() });
}
