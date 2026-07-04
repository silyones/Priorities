import type { DocumentData } from "firebase-admin/firestore";
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

/** Backend-only shape — includes phoneNumber for issue assignment / migration. */
export type SubmissionInternal = SubmissionListItem & {
  name: string;
  role: string;
  phoneNumber: string | null;
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

function mapSubmissionDoc(
  id: string,
  data: DocumentData,
  includePhone: boolean,
): SubmissionInternal {
  const hasImage = data.hasImage === true;
  const phoneRaw = data.phoneNumber;
  return {
    id,
    topic: data.topic ?? "",
    description: data.description ?? "",
    issueType: data.issueType ?? "",
    severity: data.severity ?? "",
    locality: data.locality ?? "",
    submittedFor: data.submittedFor ?? "",
    name: data.name ?? "",
    role: data.role ?? "",
    aiTags: Array.isArray(data.aiTags) ? data.aiTags.map(String) : [],
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    hasImage,
    createdAt: serializeCreatedAt(data.createdAt),
    phoneNumber:
      includePhone && typeof phoneRaw === "string" && phoneRaw.trim()
        ? phoneRaw.trim()
        : null,
  };
}

export async function listSubmissions(): Promise<SubmissionListItem[]> {
  const internal = await listSubmissionsInternal();
  return internal.map(({ phoneNumber: _phone, name: _name, role: _role, ...item }) => item);
}

export async function listSubmissionsInternal(): Promise<SubmissionInternal[]> {
  const db = getFirestoreDb();
  const snap = await db
    .collection("submissions")
    .orderBy("createdAt", "desc")
    .select(
      "topic",
      "description",
      "issueType",
      "severity",
      "locality",
      "submittedFor",
      "name",
      "role",
      "aiTags",
      "latitude",
      "longitude",
      "hasImage",
      "phoneNumber",
      "createdAt",
    )
    .get();

  return snap.docs.map((docSnap) =>
    mapSubmissionDoc(docSnap.id, docSnap.data(), true),
  );
}

export async function getSubmissionImage(id: string): Promise<string | null> {
  const db = getFirestoreDb();
  const snap = await db.collection("submissions").doc(id).get();
  if (!snap.exists) return null;

  const imageBase64 = snap.data()?.imageBase64;
  return typeof imageBase64 === "string" && imageBase64.trim() ? imageBase64 : null;
}

export async function getSubmissionById(id: string): Promise<SubmissionDetail | null> {
  const db = getFirestoreDb();
  const snap = await db.collection("submissions").doc(id).get();
  if (!snap.exists) return null;

  const mapped = mapSubmissionDoc(snap.id, snap.data()!, false);
  const { phoneNumber: _phone, ...detail } = mapped;
  return detail;
}

export async function getSubmissionByIdInternal(id: string): Promise<SubmissionInternal | null> {
  const db = getFirestoreDb();
  const snap = await db.collection("submissions").doc(id).get();
  if (!snap.exists) return null;
  return mapSubmissionDoc(snap.id, snap.data()!, true);
}
