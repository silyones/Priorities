import { Suspense } from "react";
import { LoginClient } from "@/components/LoginClient";

function LoginFallback() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
