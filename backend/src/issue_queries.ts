import {
  FieldValue,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { getFirestoreDb } from "./firebase";

export type IssueRecord = {
  id: string;
  issueType: string;
  repTopic: string;
  repDescription: string;
  repLocality: string;
  repSubmissionId: string;
  aiTitle: string | null;
  status: string;
  submissionIds: string[];
  subscriberCount: number;
  lastNotifiedStatus: string | null;
  createdAt: string | null;
  completedAt: string | null;
  outcome: string | null;
};

export type SubscriberRecord = {
  phoneNumber: string;
  firstReportedAt: string | null;
};

function serializeTimestamp(value: unknown): string | null {
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

function serializeIssue(docSnap: QueryDocumentSnapshot<DocumentData>): IssueRecord {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    issueType: data.issueType ?? "",
    repTopic: data.repTopic ?? "",
    repDescription: data.repDescription ?? "",
    repLocality: data.repLocality ?? "",
    repSubmissionId: data.repSubmissionId ?? "",
    aiTitle: typeof data.aiTitle === "string" && data.aiTitle.trim() ? data.aiTitle : null,
    status: data.status ?? "Open",
    submissionIds: Array.isArray(data.submissionIds)
      ? data.submissionIds.map(String)
      : [],
    subscriberCount:
      typeof data.subscriberCount === "number" ? data.subscriberCount : 0,
    lastNotifiedStatus:
      typeof data.lastNotifiedStatus === "string" ? data.lastNotifiedStatus : null,
    createdAt: serializeTimestamp(data.createdAt),
    completedAt: serializeTimestamp(data.completedAt),
    outcome: typeof data.outcome === "string" && data.outcome.trim() ? data.outcome.trim() : null,
  };
}

export async function listIssuesByIssueType(issueType: string): Promise<IssueRecord[]> {
  const db = getFirestoreDb();
  const snap = await db
    .collection("issues")
    .where("issueType", "==", issueType)
    .get();
  return snap.docs.map(serializeIssue);
}

export async function listIssues(): Promise<IssueRecord[]> {
  const db = getFirestoreDb();
  const snap = await db.collection("issues").orderBy("createdAt", "desc").get();
  return snap.docs.map(serializeIssue);
}

export async function getIssueById(id: string): Promise<IssueRecord | null> {
  const db = getFirestoreDb();
  const snap = await db.collection("issues").doc(id).get();
  if (!snap.exists) return null;
  return serializeIssue(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function createIssue(input: {
  issueType: string;
  repTopic: string;
  repDescription: string;
  repLocality: string;
  repSubmissionId: string;
  submissionId: string;
  phoneNumber?: string;
  aiTitle?: string;
}): Promise<{ id: string; newSubscriber: boolean }> {
  const db = getFirestoreDb();
  const issueRef = db.collection("issues").doc();

  let newSubscriber = false;
  if (input.phoneNumber) {
    newSubscriber = true;
  }

  await issueRef.set({
    issueType: input.issueType,
    repTopic: input.repTopic,
    repDescription: input.repDescription,
    repLocality: input.repLocality,
    repSubmissionId: input.repSubmissionId,
    aiTitle: input.aiTitle ?? null,
    status: "Open",
    submissionIds: [input.submissionId],
    subscriberCount: newSubscriber ? 1 : 0,
    lastNotifiedStatus: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (input.phoneNumber) {
    await issueRef.collection("subscribers").doc(input.phoneNumber).set({
      phoneNumber: input.phoneNumber,
      firstReportedAt: FieldValue.serverTimestamp(),
    });
  }

  return { id: issueRef.id, newSubscriber };
}

export async function attachSubmissionToIssue(input: {
  issueId: string;
  submissionId: string;
  phoneNumber?: string;
}): Promise<{ newSubscriber: boolean }> {
  const db = getFirestoreDb();
  const issueRef = db.collection("issues").doc(input.issueId);

  let newSubscriber = false;
  if (input.phoneNumber) {
    const subRef = issueRef.collection("subscribers").doc(input.phoneNumber);
    const existing = await subRef.get();
    if (!existing.exists) {
      await subRef.set({
        phoneNumber: input.phoneNumber,
        firstReportedAt: FieldValue.serverTimestamp(),
      });
      newSubscriber = true;
    }
  }

  const update: Record<string, unknown> = {
    submissionIds: FieldValue.arrayUnion(input.submissionId),
  };
  if (newSubscriber) {
    update.subscriberCount = FieldValue.increment(1);
  }

  await issueRef.update(update);
  return { newSubscriber };
}

export async function listIssueSubscribers(issueId: string): Promise<SubscriberRecord[]> {
  const db = getFirestoreDb();
  const snap = await db
    .collection("issues")
    .doc(issueId)
    .collection("subscribers")
    .orderBy("firstReportedAt", "desc")
    .get();

  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      phoneNumber: data.phoneNumber ?? docSnap.id,
      firstReportedAt: serializeTimestamp(data.firstReportedAt),
    };
  });
}

export async function updateIssueStatus(input: {
  issueId: string;
  status: string;
  lastNotifiedStatus?: string | null;
  outcome?: string | null;
}): Promise<IssueRecord> {
  const db = getFirestoreDb();
  const issueRef = db.collection("issues").doc(input.issueId);
  const update: Record<string, unknown> = { status: input.status };
  if (input.status === "Completed") {
    update.completedAt = FieldValue.serverTimestamp();
    if (input.outcome !== undefined) {
      const trimmed = input.outcome?.trim() ?? "";
      update.outcome = trimmed || null;
    }
  } else {
    update.completedAt = null;
    update.outcome = null;
  }
  if (input.lastNotifiedStatus !== undefined) {
    update.lastNotifiedStatus = input.lastNotifiedStatus;
  }
  await issueRef.update(update);
  const updated = await getIssueById(input.issueId);
  if (!updated) throw new Error("Issue not found after update");
  return updated;
}

/** One-time migration helper — creates issue + optional subscriber docs. */
export async function createIssueFromGroup(input: {
  issueType: string;
  repTopic: string;
  repDescription: string;
  repLocality: string;
  repSubmissionId: string;
  submissionIds: string[];
  phoneNumbers: string[];
  aiTitle?: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const issueRef = db.collection("issues").doc();
  const uniquePhones = [...new Set(input.phoneNumbers.filter(Boolean))];

  await issueRef.set({
    issueType: input.issueType,
    repTopic: input.repTopic,
    repDescription: input.repDescription,
    repLocality: input.repLocality,
    repSubmissionId: input.repSubmissionId,
    aiTitle: input.aiTitle ?? null,
    status: "Open",
    submissionIds: input.submissionIds,
    subscriberCount: uniquePhones.length,
    lastNotifiedStatus: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await Promise.all(
    uniquePhones.map((phoneNumber) =>
      issueRef.collection("subscribers").doc(phoneNumber).set({
        phoneNumber,
        firstReportedAt: FieldValue.serverTimestamp(),
      }),
    ),
  );

  return issueRef.id;
}

export async function countIssues(): Promise<number> {
  const db = getFirestoreDb();
  const snap = await db.collection("issues").count().get();
  return snap.data().count;
}
