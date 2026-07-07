"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

function AuthLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
        <p className="label mt-4">Verifying access…</p>
      </div>
    </div>
  );
}

/** Blocks dashboard content until Firebase + server allowlist checks pass. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, accessDeniedMessage } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
    if (status === "access_denied") {
      router.replace("/?denied=1");
    }
  }, [status, router]);

  if (status === "loading") {
    return <AuthLoading />;
  }

  if (status !== "authenticated") {
    return <AuthLoading />;
  }

  return <>{children}</>;
}

export { AuthLoading };
