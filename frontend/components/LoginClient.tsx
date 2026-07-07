"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn } from "lucide-react";
import { Logo } from "@/components/Logo";
import { signInWithEmail } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";


export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, establishSession, accessDeniedMessage } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deniedFromUrl = searchParams.get("denied") === "1";
  const showDenied = deniedFromUrl || accessDeniedMessage;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithEmail(email, password);
      const ok = await establishSession(user);
      if (ok) {
        router.replace("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email sign-in failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseClientConfigured()) {
    return (
      <div className="container-pp flex min-h-[80vh] items-center justify-center py-16">
        <div className="card max-w-md p-8 text-center">
          <p className="label mb-2">Configuration</p>
          <h1 className="display text-2xl font-semibold text-ink">Firebase not configured</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Add NEXT_PUBLIC_FIREBASE_* variables to frontend/.env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-pp flex min-h-[80vh] items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href="/" className="mb-6" />
          <p className="label mb-2">MP Office</p>
          <h1 className="display text-3xl font-semibold tracking-tight text-ink">
            Sign in to continue
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Access the constituency dashboard for authorized MP office staff.
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {showDenied && (
            <div
              role="alert"
              className="warning-banner mb-6 text-sm"
            >
              Access denied — contact admin for access
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-tag-red-bg bg-tag-red-bg px-4 py-3 text-sm text-tag-red-text"
            >
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
            <label className="block">
              <span className="label mb-1.5 block">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-cream py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-accent"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="label mb-1.5 block">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-cream py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-accent"
                  placeholder="••••••••"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy || status === "loading"}
              className="btn-primary w-full disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Rajgarh · MP Office — authorized staff only
        </p>
      </motion.div>
    </div>
  );
}
