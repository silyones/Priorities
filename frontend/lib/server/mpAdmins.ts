import type { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "./firebaseAdmin";

export type MpAdminRecord = {
  email: string;
  role: string;
  addedAt: Timestamp | null;
};

/** Server-side allowlist check against the mp_admins Firestore collection. */
export async function isMpAdminEmail(email: string): Promise<MpAdminRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const db = getAdminFirestore();
  const snapshot = await db
    .collection("mp_admins")
    .where("email", "==", normalized)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0]!;
  const data = doc.data();
  return {
    email: (data.email as string) ?? normalized,
    role: (data.role as string) ?? "admin",
    addedAt: (data.addedAt as Timestamp) ?? null,
  };
}
