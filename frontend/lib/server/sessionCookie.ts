import { cookies } from "next/headers";
import { MP_SESSION_COOKIE, verifySessionToken, type MpSessionPayload } from "./session";

export async function readSessionFromCookies(): Promise<MpSessionPayload | null> {
  const token = cookies().get(MP_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
