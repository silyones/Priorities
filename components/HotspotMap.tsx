"use client";

import { motion } from "framer-motion";
import type { Cluster } from "@/lib/types";
import { CATEGORY_META } from "./ui";

// Stylized constituency canvas (PRD 4.8). Clusters are geotagged at ward/
// locality granularity and rendered as demand hotspots; size scales with the
// number of affected citizens, colour encodes category.
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
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white">
      {/* faint ward grid */}
      <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
        <defs>
          <pattern id="grid" width="10%" height="13.33%" patternUnits="userSpaceOnUse">
            <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#bbb09c" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* a soft constituency boundary */}
        <path
          d="M8,30 C12,12 35,8 55,12 C78,16 95,28 92,50 C90,72 70,92 48,90 C26,88 4,72 8,30 Z"
          transform="scale(1)"
          vectorEffect="non-scaling-stroke"
          fill="rgba(29,101,67,0.05)"
          stroke="rgba(29,101,67,0.22)"
          strokeWidth="1"
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        />
      </svg>

      {clusters.map((c) => {
        const size = 18 + (c.affected / maxAffected) * 46;
        const meta = CATEGORY_META[c.category];
        const selected = c.id === selectedId;
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
                background:
                  "radial-gradient(circle, rgba(189,90,51,0.30), rgba(189,90,51,0))",
              }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.3, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className={`relative flex items-center justify-center rounded-full border-2 bg-paper-50 shadow-soft transition-all ${
                selected ? "border-ink-900 ring-4 ring-forest-200" : "border-paper-50"
              } ${meta.bg}`}
              style={{ width: size * 0.5, height: size * 0.5 }}
            >
              <meta.icon className={`h-3.5 w-3.5 ${meta.tint}`} />
            </span>
            <span
              className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-1.5 py-0.5 text-[10px] font-medium text-white transition-opacity ${
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {c.ward} · {c.affected}
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-3 left-3 rounded-lg bg-paper-50/80 px-2.5 py-1.5 text-[10px] font-medium text-ink-500 backdrop-blur">
        Bubble size = citizens affected · tap a hotspot
      </div>
    </div>
  );
}
