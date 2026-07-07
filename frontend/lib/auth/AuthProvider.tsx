"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getClientAuth, getIdToken, signOutClient } from "@/lib/firebase/client";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "access_denied";

export type AuthUser = {
  uid: string;
  email: string;
  role: string;
};

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  firebaseUser: User | null;
  accessDeniedMessage: string | null;
  establishSession: (firebaseUser: User) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_DENIED_MESSAGE = "Access denied — contact admin for access";

async function clearServerSession(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

async function verifyAndCreateSession(idToken: string): Promise<{
  ok: boolean;
  accessDenied: boolean;
  email?: string;
  role?: string;
}> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (res.ok) {
    const data = (await res.json()) as { email?: string; role?: string };
    return { ok: true, accessDenied: false, email: data.email, role: data.role };
  }

  if (res.status === 403) {
    return { ok: false, accessDenied: true };
  }

  return { ok: false, accessDenied: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  const establishSession = useCallback(async (nextUser: User): Promise<boolean> => {
    const idToken = await getIdToken(nextUser, true);
    const result = await verifyAndCreateSession(idToken);

    if (result.ok && result.email) {
      setUser({
        uid: nextUser.uid,
        email: result.email,
        role: result.role ?? "admin",
      });
      setAccessDeniedMessage(null);
      setStatus("authenticated");
      return true;
    }

    if (result.accessDenied) {
      setAccessDeniedMessage(ACCESS_DENIED_MESSAGE);
      setStatus("access_denied");
    } else {
      setStatus("unauthenticated");
    }

    setUser(null);
    await signOutClient();
    await clearServerSession();
    return false;
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setFirebaseUser(null);
    setAccessDeniedMessage(null);
    setStatus("unauthenticated");
    await signOutClient();
    await clearServerSession();
  }, []);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setStatus("unauthenticated");
      return;
    }

    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setFirebaseUser(nextUser);

      if (!nextUser) {
        setUser(null);
        setAccessDeniedMessage(null);
        setStatus("unauthenticated");
        return;
      }

      setStatus("loading");
      await establishSession(nextUser);
    });

    return () => unsubscribe();
  }, [establishSession]);

  const value = useMemo(
    () => ({
      status,
      user,
      firebaseUser,
      accessDeniedMessage,
      establishSession,
      signOut,
    }),
    [status, user, firebaseUser, accessDeniedMessage, establishSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
