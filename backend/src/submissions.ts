import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "./firebase";

export type SubmissionPayload = {
  submittedFor: "myself" | "someone_else";
  name: string;
  role: string;
  locality: string;
  topic: string;
  description: string;
  imageBase64: string;
  latitude: number | null;
  longitude: number | null;
  issueType?: string;
  severity?: string;
  aiTags?: string[];
  phoneNumber?: string;
};

export async function saveSubmissionToFirestore(payload: SubmissionPayload) {
  const db = getFirestoreDb();
  const hasImage =
    typeof payload.imageBase64 === "string" && payload.imageBase64.trim().length > 0;
  const docRef = await db.collection("submissions").add({
    ...payload,
    hasImage,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: docRef.id };
}
