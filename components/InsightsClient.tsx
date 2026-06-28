"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Database, Gauge, Quote, Radio, MapPin } from "lucide-react";
import type { Cluster } from "@/lib/types";
import { HotspotMap } from "@/components/HotspotMap";
import { CategoryBadge, StatusDot, STATUS_META, UrgencyTag } from "@/components/ui";

const up = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

export function InsightsClient({ clusters, stats }: {
  clusters: Cluster[];
  stats: ReturnType<typeof import("@/lib/store").getStats>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(clusters[0]?.id ?? null);
  const selected = useMemo(() => clusters.find((c) => c.id === selectedId) ?? null, [clusters, selectedId]);

  return (
    <motion.div
      className="min-h-screen"
      style={{ background: "#0D0F14" }}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      transition={{ duration: 0.4 }}
    >
      {/* Page header */}
      <motion.div variants={up} className="border-b px-5 py-5 sm:px-8"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-7xl">
          <p className="label">Technical &amp; judge view</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Demand Hotspots &amp; Scoring</h1>
        </div>
      </motion.div>

      <div className="container-pp py-8">
        {/* Stat row */}
        <motion.div variants={up} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Voices counted", value: stats.totalVoices.toLocaleString("en-IN") },
            { label: "Demand themes",  value: stats.themes },
            { label: "Wards mapped",   value: stats.wards },
            { label: "Via relay",      value: `${Math.round(stats.relayShare * 100)}%` },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="font-mono text-2xl font-bold text-white">{s.value}</div>
              <div className="mt-0.5 text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={up} className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Map */}
          <div className="card p-4 sm:p-6 lg:col-span-3">
            <h2 className="mb-4 text-lg font-bold text-white">Demand hotspots</h2>
            <HotspotMap clusters={clusters} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div key={selected.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}
                  className="card h-full p-6">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={selected.category} />
                    <span className="flex items-center gap-2 text-xs font-medium text-white/50">
                      <StatusDot status={selected.status} />
                      {STATUS_META[selected.status].label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-white">{selected.title}</h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-white/50">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {selected.locality}
                    </span>
                    <UrgencyTag urgency={selected.urgency} />
                  </div>

                  {/* Score breakdown */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-white/70">
                        <Gauge className="h-4 w-4 text-amber-400" /> Priority score
                      </span>
                      <span className="font-mono text-2xl font-bold text-amber-400">{selected.score}</span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      <ScoreBar label="Demand (cluster size)" value={selected.rationale.demandComponent} max={55} color="#F5C518" />
                      <ScoreBar label="Urgency signal" value={selected.rationale.urgencyComponent} max={25} color="#F87171" />
                      <ScoreBar label="Public dataset evidence" value={selected.rationale.dataComponent} max={20} color="#4ADE80" />
                    </div>
                  </div>

                  {selected.rationale.dataset && (
                    <div className="mt-5 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                        <Database className="h-3.5 w-3.5" /> Joined dataset
                      </span>
                      <div className="mt-2 text-sm font-semibold text-white">{selected.rationale.dataset.name}</div>
                      <div className="text-sm text-white/50">
                        {selected.rationale.dataset.metric}:{" "}
                        <span className="font-semibold text-white/80">{selected.rationale.dataset.value}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-white/30">Source: {selected.rationale.dataset.source}</div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-white/40">
                        <Radio className="h-3 w-3" /> Relay-submitted
                      </span>
                      <div className="mt-1 font-mono text-lg font-bold text-white">
                        {Math.round(selected.relayShare * 100)}%
                      </div>
                    </div>
                    <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-[11px] font-medium text-white/40">Affected</span>
                      <div className="mt-1 font-mono text-lg font-bold text-white">
                        {selected.affected.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
                      <Quote className="h-3.5 w-3.5" /> Submissions
                    </span>
                    <div className="mt-2 space-y-2">
                      {selected.sampleQuotes.slice(0, 3).map((q, i) => (
                        <p key={i} className="rounded-xl px-3 py-2 text-xs italic text-white/50"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          "{q}"
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Ranked table */}
        <motion.div variants={up} className="mt-6">
          <div className="card overflow-hidden">
            <div className="border-b px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <h2 className="text-lg font-bold text-white">Ranked priority list</h2>
              <p className="text-sm text-white/40">Click a row to inspect on the map</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-white/30"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <tr>
                    {["#", "Theme", "Ward", "Affected", "Status", "Score"].map((h) => (
                      <th key={h} className={`px-6 py-3 font-semibold ${h === "Score" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {clusters.map((c, i) => (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)}
                      className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                      style={c.id === selectedId ? { background: "rgba(245,197,24,0.06)" } : undefined}>
                      <td className="px-6 py-3 font-mono text-white/30">{i + 1}</td>
                      <td className="px-6 py-3 font-medium text-white">{c.title}</td>
                      <td className="px-6 py-3 text-white/50">{c.ward}</td>
                      <td className="px-6 py-3 font-semibold text-white/70">{c.affected.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                          <StatusDot status={c.status} /> {STATUS_META[c.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-amber-400">{c.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ScoreBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>{label}</span>
        <span className="font-semibold text-white/60">+{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${(value / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
