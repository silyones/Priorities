import fs from "fs";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// gRPC Firestore can hang on some container hosts (e.g. Railway). Prefer REST there.
if (!process.env.FIRESTORE_PREFER_REST) {
  process.env.FIRESTORE_PREFER_REST = "true";
}

let adminApp: App | undefined;
let firestoreDb: Firestore | undefined;

function parseServiceAccount(raw: string): object {
  const data = JSON.parse(raw) as { private_key?: string };
  if (typeof data.private_key === "string") {
    data.private_key = data.private_key.replace(/\\n/g, "\n");
  }
  return data;
}

function initAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (jsonPath) {
    const raw = fs.readFileSync(jsonPath, "utf8");
    adminApp = initializeApp({
      credential: cert(parseServiceAccount(raw)),
      projectId,
    });
    return adminApp;
  }

  if (jsonInline) {
    adminApp = initializeApp({
      credential: cert(parseServiceAccount(jsonInline)),
      projectId,
    });
    return adminApp;
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env",
  );
}

export function getFirestoreDb(): Firestore {
  if (firestoreDb) return firestoreDb;

  const db = getFirestore(initAdminApp());
  // Env var alone is not always enough — explicitly force REST before any query.
  db.settings({ preferRest: true });
  firestoreDb = db;
  return firestoreDb;
}
