import { NextResponse } from "next/server";
import { getShowcase } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  // Public showcase = completed, MP-approved items only (PRD 4.6).
  return NextResponse.json({ items: getShowcase() });
}
