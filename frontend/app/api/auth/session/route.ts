import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/server/firebaseAdmin";
import { isMpAdminEmail } from "@/lib/server/mpAdmins";
import { createSessionToken, sessionCookieOptions } from "@/lib/server/session";
import { readSessionFromCookies } from "@/lib/server/sessionCookie";

export const runtime = "nodejs";

type SessionBody = {
  idToken?: string;
};

/** Verify Firebase ID token + mp_admins allowlist, then issue an httpOnly session cookie. */
export async function POST(request: Request) {
  let body: SessionBody;
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const idToken = body.idToken?.trim();
  if (!idToken) {
    return NextResponse.json({ detail: "idToken is required" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { detail: "Signed-in account has no email address" },
        { status: 403 },
      );
    }

    const adminRecord = await isMpAdminEmail(email);
    if (!adminRecord) {
      return NextResponse.json(
        { detail: "access_denied", message: "Access denied — contact admin for access" },
        { status: 403 },
      );
    }

    const sessionToken = await createSessionToken({
      uid: decoded.uid,
      email: adminRecord.email,
      role: adminRecord.role,
    });

    const response = NextResponse.json({
      ok: true,
      email: adminRecord.email,
      role: adminRecord.role,
    });
    response.cookies.set(sessionCookieOptions(sessionToken));
    return response;
  } catch (error) {
    console.error("auth/session POST failed:", error);
    return NextResponse.json({ detail: "Invalid or expired sign-in token" }, { status: 401 });
  }
}

/** Return the current server-verified session (requires valid session cookie). */
export async function GET() {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const adminRecord = await isMpAdminEmail(session.email);
  if (!adminRecord) {
    return NextResponse.json(
      { authenticated: false, detail: "access_denied" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    email: adminRecord.email,
    role: adminRecord.role,
  });
}
