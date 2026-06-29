import Link from "next/link";
import { Mic } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="container-pp flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center py-16 text-center">
        <p className="label mb-3">Citizen app · Phase 4 preview coming</p>
        <h1 className="display max-w-lg text-4xl font-semibold tracking-tight text-ink">
          Your voice shapes constituency priorities
        </h1>
        <p className="mt-4 max-w-md text-ink-muted">
          The full citizen home experience is on the way. For now, you can submit a voice
          or relay someone else&apos;s need.
        </p>
        <Link href="/submit" className="btn-primary mt-8 inline-flex">
          <Mic className="h-4 w-4" /> Submit a voice
        </Link>
      </div>
    </div>
  );
}
