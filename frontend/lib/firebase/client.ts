"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseClientConfig, isFirebaseClientConfigured } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let persistenceReady = false;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error(
      "Firebase client is not configured. Set NEXT_PUBLIC_FIREBASE_* in frontend/.env.local",
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseClientConfig);
  }
  return app;
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (!persistenceReady) {
      persistenceReady = true;
      void setPersistence(auth, browserLocalPersistence);
    }
  }
  return auth;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
  return result.user;
}

export async function signOutClient(): Promise<void> {
  await firebaseSignOut(getClientAuth());
}

export async function getIdToken(user: User, forceRefresh = false): Promise<string> {
  return user.getIdToken(forceRefresh);
}
