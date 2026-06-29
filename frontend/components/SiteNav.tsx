"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LayoutDashboard, Mic, Layers, Megaphone, FlaskConical } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/submit",   label: "Submit",    icon: Mic            },
  { href: "/mp",       label: "MP Triage", icon: Layers         },
  { href: "/showcase", label: "Showcase",  icon: Megaphone      },
  { href: "/insights", label: "Insights",  icon: FlaskConical   },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className="no-print sticky top-0 z-50 border-b border-border-subtle bg-ink/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-5 sm:px-8">
        <Link href="/" className="mr-4 shrink-0">
          <Logo />
        </Link>

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
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-surface-white">
              M
            </span>
            <span className="text-xs font-medium text-white/80">Rajgarh · MP Office</span>
          </div>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white md:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink p-3 md:hidden">
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
                    : "text-white/70 hover:bg-white/10 hover:text-white"
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
