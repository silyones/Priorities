import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookieOptions());
  return response;
}
