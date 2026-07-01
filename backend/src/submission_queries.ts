import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { getFirestoreDb } from "./firebase";

export type SubmissionListItem = {
  id: string;
  topic: string;
  description: string;
  issueType: string;
  severity: string;
  locality: string;
  submittedFor: string;
  createdAt: string | null;
};

function serializeCreatedAt(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

export async function listSubmissions(): Promise<SubmissionListItem[]> {
  const db = getFirestoreDb();
  const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      topic: data.topic ?? "",
      description: data.description ?? "",
      issueType: data.issueType ?? "",
      severity: data.severity ?? "",
      locality: data.locality ?? "",
      submittedFor: data.submittedFor ?? "",
      createdAt: serializeCreatedAt(data.createdAt),
    };
  });
}

export async function getSubmissionImage(id: string): Promise<string | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "submissions", id));
  if (!snap.exists()) return null;

  const imageBase64 = snap.data().imageBase64;
  return typeof imageBase64 === "string" && imageBase64.trim() ? imageBase64 : null;
}
