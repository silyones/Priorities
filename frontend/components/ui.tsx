"use client";

import {
  Droplets,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  Route,
  Trash2,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import type { Category, ClusterStatus, Urgency } from "@/lib/types";

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; tint: string; bg: string }> = {
  roads:       { label: "Roads",       icon: Route,          tint: "text-amber-300",  bg: "bg-amber-500/15"  },
  water:       { label: "Water",       icon: Droplets,       tint: "text-teal-300",   bg: "bg-teal-500/15"   },
  sanitation:  { label: "Sanitation",  icon: Trash2,         tint: "text-lime-300",   bg: "bg-lime-500/15"   },
  education:   { label: "Education",   icon: GraduationCap,  tint: "text-orange-300", bg: "bg-orange-500/15" },
  health:      { label: "Health",      icon: HeartPulse,     tint: "text-rose-300",   bg: "bg-rose-500/15"   },
  electricity: { label: "Electricity", icon: Lightbulb,      tint: "text-yellow-300", bg: "bg-yellow-500/15" },
  other:       { label: "Other",       icon: CircleDot,      tint: "text-white/50",   bg: "bg-white/8"       },
};

export function CategoryBadge({ category }: { category: Category }) {
  const m = CATEGORY_META[category];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${m.bg} px-2.5 py-1 text-xs font-semibold ${m.tint}`}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}

// Status is a COLOUR-CODED DOT, never a status word or day-count (PRD 4.5).
export const STATUS_META: Record<ClusterStatus, { label: string; dot: string; ring: string }> = {
  new:       { label: "New theme",         dot: "bg-amber-400",         ring: "bg-amber-300"      },
  forwarded: { label: "Forwarded",         dot: "bg-teal-400",          ring: "bg-teal-300"       },
  handling:  { label: "Already handling",  dot: "bg-emerald-400",       ring: "bg-emerald-300"    },
  info:      { label: "Needs information", dot: "bg-orange-400",        ring: "bg-orange-300"     },
  published: { label: "Published",         dot: "bg-white",             ring: "bg-white/50"       },
};

export function StatusDot({ status, pulse = false }: { status: ClusterStatus; pulse?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center" title={m.label}>
      {pulse && (
        <span className={`absolute inline-flex h-2.5 w-2.5 animate-pulse-ring rounded-full ${m.ring}`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${m.dot}`} />
    </span>
  );
}

const URGENCY_META: Record<Urgency, { label: string; cls: string }> = {
  safety: { label: "Safety risk", cls: "bg-rose-500/20 text-rose-300"   },
  high:   { label: "High",        cls: "bg-amber-500/20 text-amber-300" },
  normal: { label: "Normal",      cls: "bg-white/8 text-white/40"       },
};

export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  const m = URGENCY_META[urgency];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>{m.label}</span>
  );
}
