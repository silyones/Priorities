"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Layers,
  Megaphone,
  FlaskConical,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Logo } from "./Logo";
import {
  TRANSLATE_LANGUAGES,
  changeTranslateLanguage,
  getStoredLanguage,
  type TranslateCode,
} from "./GoogleTranslate";
import { useAuth } from "@/lib/auth/AuthProvider";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mp", label: "MP Triage", icon: Layers },
  { href: "/showcase", label: "Showcase", icon: Megaphone },
  { href: "/insights", label: "Insights", icon: FlaskConical },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<TranslateCode>("en");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  useEffect(() => {
    setLanguage(getStoredLanguage());
  }, []);

  function handleLanguageChange(next: TranslateCode) {
    setLanguage(next);
    changeTranslateLanguage(next);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  const displayEmail = user?.email ?? "MP Office";
  const initial = displayEmail.charAt(0).toUpperCase();

  return (
    <header className="no-print sticky top-0 z-50 border-b border-border-subtle bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-5 sm:px-8">
        <Logo className="mr-4 shrink-0" />

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-accent font-semibold text-ink"
                    : "text-ink hover:bg-surface-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <div className="relative">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as TranslateCode)}
              className="notranslate appearance-none rounded-lg border border-accent bg-surface-white py-1.5 pl-3 pr-9 text-sm text-ink outline-none focus:border-accent"
            >
              {TRANSLATE_LANGUAGES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-white px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-ink">
              {initial}
            </span>
            <span className="max-w-[140px] truncate text-xs font-medium text-ink">
              {displayEmail}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="btn-ghost !rounded-lg !px-3 !py-1.5 text-xs disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-ink md:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border-subtle bg-cream p-3 md:hidden">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent font-semibold text-ink"
                    : "text-ink hover:bg-surface-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-surface-white disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
