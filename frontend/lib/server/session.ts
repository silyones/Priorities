import { SignJWT, jwtVerify } from "jose";

export const MP_SESSION_COOKIE = "mp_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export type MpSessionPayload = {
  uid: string;
  email: string;
  role: string;
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.MP_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("MP_SESSION_SECRET is not configured on the Next.js server");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: MpSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<MpSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const uid = payload.uid;
    const email = payload.email;
    const role = payload.role;
    if (typeof uid !== "string" || typeof email !== "string" || typeof role !== "string") {
      return null;
    }
    return { uid, email, role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: MP_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function clearSessionCookieOptions() {
  return {
    name: MP_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
