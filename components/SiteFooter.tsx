import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="no-print mt-24 border-t border-ink-100 bg-paper-50/60">
      <div className="container-pp py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              AI that makes citizen demand impossible to miss — and makes acting on it nearly
              effortless. Built for the Build with AI · Code for Communities track.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <span className="col-span-2 mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">
              Surfaces
            </span>
            <Link href="/submit" className="text-ink-600 hover:text-ink-900">
              Raise a voice
            </Link>
            <Link href="/mp" className="text-ink-600 hover:text-ink-900">
              MP triage
            </Link>
            <Link href="/showcase" className="text-ink-600 hover:text-ink-900">
              Public showcase
            </Link>
            <Link href="/insights" className="text-ink-600 hover:text-ink-900">
              Judge insights
            </Link>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-ink-100 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} People&apos;s Priorities · Prototype</span>
          <span>One backend · four skins · zero failure metrics.</span>
        </div>
      </div>
    </footer>
  );
}
