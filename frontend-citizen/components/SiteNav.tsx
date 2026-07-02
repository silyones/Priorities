"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Home, Mic, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";

type Language = "english" | "kannada" | "hindi" | "tamil" | "telugu" | "bengali";

const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: "english", label: "English" },
  { code: "kannada", label: "ಕನ್ನಡ" },
  { code: "hindi", label: "हिंदी" },
  { code: "tamil", label: "தமிழ்" },
  { code: "telugu", label: "తెలుగు" },
  { code: "bengali", label: "বাংলা" },
];

const NAV_COPY: Record<Language, { home: string; language: string; submit: string }> = {
  english: { home: "Home", submit: "Submit", language: "Language" },
  kannada: { home: "ಮುಖಪುಟ", submit: "ಸಲ್ಲಿಸಿ", language: "ಭಾಷೆ" },
  hindi: { home: "होम", submit: "सबमिट करें", language: "भाषा" },
  tamil: { home: "முகப்பு", submit: "சமர்ப்பிக்கவும்", language: "மொழி" },
  telugu: { home: "హోమ్", submit: "సమర్పించండి", language: "భాష" },
  bengali: { home: "হোম", submit: "জমা দিন", language: "ভাষা" },
};

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("english");

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  useEffect(() => {
    const stored = localStorage.getItem("citizen-language") as Language | null;
    if (stored) setLanguage(stored);
  }, []);

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    localStorage.setItem("citizen-language", next);
    window.dispatchEvent(new Event("citizen-language-change"));
  }

  const navCopy = NAV_COPY[language];
  const LINKS = [
    { href: "/", label: navCopy.home, icon: Home },
    { href: "/submit", label: navCopy.submit, icon: Mic },
  ];

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
                    ? "bg-accent font-semibold text-surface-white"
                    : "text-ink hover:bg-surface-white hover:text-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center md:flex">
          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <span className="font-medium">{navCopy.language}</span>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="appearance-none rounded-lg border border-accent bg-surface-white py-1.5 pl-3 pr-9 text-sm text-ink outline-none focus:border-accent"
              >
                {LANG_OPTIONS.map((option) => (
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
          </label>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-ink md:hidden"
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
                    ? "bg-accent font-semibold text-surface-white"
                    : "text-ink hover:bg-surface-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
