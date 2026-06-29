"use client";

import { motion } from "framer-motion";
import type { Cluster } from "@/lib/types";
import { CATEGORY_META } from "./ui";
import type { TagColor } from "./ui/Tag";

const TAG_DOT_BG: Record<TagColor, string> = {
  red:    "bg-tag-red-bg",
  teal:   "bg-tag-teal-bg",
  orange: "bg-tag-orange-bg",
  blue:   "bg-tag-blue-bg",
  pink:   "bg-tag-pink-bg",
};

const TAG_DOT_TEXT: Record<TagColor, string> = {
  red:    "text-tag-red-text",
  teal:   "text-tag-teal-text",
  orange: "text-tag-orange-text",
  blue:   "text-tag-blue-text",
  pink:   "text-tag-pink-text",
};

export function HotspotMap({
  clusters,
  selectedId,
  onSelect,
}: {
  clusters: Cluster[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const maxAffected = Math.max(...clusters.map((c) => c.affected), 1);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-cream to-surface-white">
      <svg className="absolute inset-0 h-full w-full opacity-50" aria-hidden>
        <defs>
          <pattern id="grid" width="10%" height="13.33%" patternUnits="userSpaceOnUse">
            <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#E7E2D6" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <path
          d="M8,30 C12,12 35,8 55,12 C78,16 95,28 92,50 C90,72 70,92 48,90 C26,88 4,72 8,30 Z"
          transform="scale(1)"
          vectorEffect="non-scaling-stroke"
          fill="rgba(31,90,77,0.06)"
          stroke="rgba(31,90,77,0.25)"
          strokeWidth="1"
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        />
      </svg>

      {clusters.map((c) => {
        const size = 18 + (c.affected / maxAffected) * 46;
        const meta = CATEGORY_META[c.category];
        const tagColor = meta.tagColor;
        const dotBg = tagColor ? TAG_DOT_BG[tagColor] : "bg-border-subtle";
        const dotText = tagColor ? TAG_DOT_TEXT[tagColor] : "text-ink-muted";
        const selected = c.id === selectedId;
        const Icon = meta.icon;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
            style={{ left: `${c.geo.x}%`, top: `${c.geo.y}%` }}
            aria-label={`${c.title}, ${c.affected} affected`}
          >
            <motion.span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: size,
                height: size,
                background: "radial-gradient(circle, rgba(194,80,46,0.25), rgba(194,80,46,0))",
              }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.3, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className={`relative flex items-center justify-center rounded-full border-2 border-surface-white shadow-soft transition-all ${dotBg} ${
                selected ? "ring-4 ring-accent/25" : ""
              }`}
              style={{ width: size * 0.5, height: size * 0.5 }}
            >
              <Icon className={`h-3.5 w-3.5 ${dotText}`} />
            </span>
            <span
              className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-medium text-surface-white transition-opacity ${
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {c.ward} · {c.affected}
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-3 left-3 rounded-lg border border-border-subtle bg-surface-white/90 px-2.5 py-1.5 text-[10px] font-medium text-ink-muted backdrop-blur">
        Bubble size = citizens affected · tap a hotspot
      </div>
    </div>
  );
}
