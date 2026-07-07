import fs from "fs";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// gRPC Firestore can hang on some container hosts (e.g. Railway). Prefer REST there.
if (!process.env.FIRESTORE_PREFER_REST) {
  process.env.FIRESTORE_PREFER_REST = "true";
}

let adminApp: App | undefined;

function initAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (jsonInline) {
    adminApp = initializeApp({
      credential: cert(JSON.parse(jsonInline) as object),
      projectId,
    });
    return adminApp;
  }

  if (jsonPath) {
    const raw = fs.readFileSync(jsonPath, "utf8");
    adminApp = initializeApp({
      credential: cert(JSON.parse(raw) as object),
      projectId,
    });
    return adminApp;
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env",
  );
}

export function getFirestoreDb(): Firestore {
  return getFirestore(initAdminApp());
}
