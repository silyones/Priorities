import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing in backend/.env: ${missing.join(", ")}`,
    );
  }

  return config as {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
}

function initFirebase() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(getFirebaseConfig());
}

export function getFirestoreDb() {
  const app = initFirebase();
  return getFirestore(app);
}
