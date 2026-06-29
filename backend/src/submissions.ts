import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
};

export async function saveSubmissionToFirestore(payload: SubmissionPayload) {
  const db = getFirestoreDb();
  const docRef = await addDoc(collection(db, "submissions"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id };
}
