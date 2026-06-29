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
import { Tag, type TagColor } from "./ui/Tag";

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; tagColor: TagColor | null }> = {
  roads:       { label: "Roads",       icon: Route,          tagColor: "blue"   },
  water:       { label: "Water",       icon: Droplets,       tagColor: "teal"   },
  sanitation:  { label: "Sanitation",  icon: Trash2,         tagColor: "teal"   },
  education:   { label: "Education",   icon: GraduationCap,  tagColor: "orange" },
  health:      { label: "Health",      icon: HeartPulse,     tagColor: "pink"   },
  electricity: { label: "Electricity", icon: Lightbulb,      tagColor: "blue"   },
  other:       { label: "Other",       icon: CircleDot,      tagColor: null     },
};

export function CategoryBadge({ category }: { category: Category }) {
  const m = CATEGORY_META[category];
  const Icon = m.icon;
  if (m.tagColor) {
    return (
      <Tag color={m.tagColor}>
        <Icon className="h-3.5 w-3.5" />
        {m.label}
      </Tag>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-cream px-2.5 py-1 text-xs font-semibold text-ink-muted">
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}

export const STATUS_META: Record<ClusterStatus, { label: string; dot: string; ring: string }> = {
  new:       { label: "New theme",         dot: "bg-accent",          ring: "bg-accent/40"          },
  forwarded: { label: "Forwarded",         dot: "bg-tag-teal-text",   ring: "bg-tag-teal-text/40"   },
  handling:  { label: "Already handling",  dot: "bg-tag-teal-text",   ring: "bg-tag-teal-bg"        },
  info:      { label: "Needs information", dot: "bg-tag-orange-text", ring: "bg-tag-orange-bg"      },
  published: { label: "Published",         dot: "bg-ink",             ring: "bg-ink-muted/40"       },
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

const URGENCY_META: Record<Urgency, { label: string; color: TagColor | null }> = {
  safety: { label: "Safety risk",   color: "red"    },
  high:   { label: "High priority", color: "orange" },
  normal: { label: "Normal",        color: null     },
};

export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  const m = URGENCY_META[urgency];
  if (m.color) return <Tag color={m.color}>{m.label}</Tag>;
  return (
    <span className="rounded-full border border-border-subtle bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
      {m.label}
    </span>
  );
}
