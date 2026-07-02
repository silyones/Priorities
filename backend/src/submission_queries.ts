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
  aiTags: string[];
  latitude: number | null;
  longitude: number | null;
  hasImage: boolean;
  createdAt: string | null;
};

export type SubmissionDetail = {
  id: string;
  submittedFor: string;
  name: string;
  role: string;
  locality: string;
  topic: string;
  description: string;
  issueType: string;
  severity: string;
  aiTags: string[];
  latitude: number | null;
  longitude: number | null;
  hasImage: boolean;
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
    const imageBase64 = data.imageBase64;
    const hasImage = typeof imageBase64 === "string" && imageBase64.trim().length > 0;
    return {
      id: docSnap.id,
      topic: data.topic ?? "",
      description: data.description ?? "",
      issueType: data.issueType ?? "",
      severity: data.severity ?? "",
      locality: data.locality ?? "",
      submittedFor: data.submittedFor ?? "",
      aiTags: Array.isArray(data.aiTags) ? data.aiTags.map(String) : [],
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      hasImage,
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

export async function getSubmissionById(id: string): Promise<SubmissionDetail | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "submissions", id));
  if (!snap.exists()) return null;

  const data = snap.data();
  const imageBase64 = data.imageBase64;
  const hasImage = typeof imageBase64 === "string" && imageBase64.trim().length > 0;

  return {
    id: snap.id,
    submittedFor: data.submittedFor ?? "",
    name: data.name ?? "",
    role: data.role ?? "",
    locality: data.locality ?? "",
    topic: data.topic ?? "",
    description: data.description ?? "",
    issueType: data.issueType ?? "",
    severity: data.severity ?? "",
    aiTags: Array.isArray(data.aiTags) ? data.aiTags.map(String) : [],
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    hasImage,
    createdAt: serializeCreatedAt(data.createdAt),
  };
}
