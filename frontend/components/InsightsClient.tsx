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

interface Stats {
  totalVoices: number; themes: number; wards: number; relayShare: number; published: number;
}

export function InsightsClient({ clusters, stats }: {
  clusters: Cluster[];
  stats: Stats | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(clusters[0]?.id ?? null);
  const selected = useMemo(() => clusters.find((c) => c.id === selectedId) ?? null, [clusters, selectedId]);

  return (
    <motion.div
      className="min-h-screen bg-cream"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      transition={{ duration: 0.4 }}
    >
      <motion.div variants={up} className="border-b border-border-subtle px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label">Technical &amp; judge view</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Demand Hotspots &amp; Scoring</h1>
        </div>
      </motion.div>

      <div className="container-pp py-8">
        <motion.div variants={up} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Voices counted", value: stats?.totalVoices.toLocaleString("en-IN") ?? "—" },
            { label: "Demand themes",  value: stats?.themes ?? "—" },
            { label: "Wards mapped",   value: stats?.wards ?? "—" },
            { label: "Via relay",      value: stats ? `${Math.round(stats.relayShare * 100)}%` : "—" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="font-mono text-2xl font-bold text-ink">{s.value}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={up} className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="card p-4 sm:p-6 lg:col-span-3">
            <h2 className="mb-4 text-lg font-bold text-ink">Demand hotspots</h2>
            <HotspotMap clusters={clusters} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div key={selected.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}
                  className="card h-full p-6">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={selected.category} />
                    <span className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                      <StatusDot status={selected.status} />
                      {STATUS_META[selected.status].label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-ink">{selected.title}</h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {selected.locality}
                    </span>
                    <UrgencyTag urgency={selected.urgency} />
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <Gauge className="h-4 w-4 text-accent" /> Priority score
                      </span>
                      <span className="font-mono text-2xl font-bold text-accent">{selected.score}</span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      <ScoreBar label="Demand (cluster size)" value={selected.rationale.demandComponent} max={55} color="var(--accent)" />
                      <ScoreBar label="Urgency signal" value={selected.rationale.urgencyComponent} max={25} color="var(--tag-red-text)" />
                      <ScoreBar label="Public dataset evidence" value={selected.rationale.dataComponent} max={20} color="var(--tag-teal-text)" />
                    </div>
                  </div>

                  {selected.rationale.dataset && (
                    <DataCard icon={<Database className="h-3.5 w-3.5" />} label="Infrastructure dataset">
                      <div className="text-sm font-semibold text-ink">{selected.rationale.dataset.name}</div>
                      <div className="text-sm text-ink-muted">{selected.rationale.dataset.metric}: <span className="font-semibold text-ink">{selected.rationale.dataset.value}</span></div>
                      <div className="mt-1 text-[11px] text-ink-muted">Source: {selected.rationale.dataset.source}</div>
                    </DataCard>
                  )}
                  {selected.rationale.demographic && (
                    <DataCard icon={<span className="text-[11px]">👥</span>} label="Demographic context (spec §8.4)">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><div className="font-mono font-bold text-ink">{selected.rationale.demographic.population.toLocaleString("en-IN")}</div><div className="text-ink-muted">population</div></div>
                        <div><div className="font-mono font-bold text-ink">{selected.rationale.demographic.literacyRate}</div><div className="text-ink-muted">literacy</div></div>
                        <div><div className="font-mono font-bold text-ink text-[10px] leading-tight">{selected.rationale.demographic.predominantOccupation}</div><div className="text-ink-muted">occupation</div></div>
                      </div>
                      <div className="mt-1 text-[11px] text-ink-muted">Source: {selected.rationale.demographic.source}</div>
                    </DataCard>
                  )}
                  {selected.rationale.developmentPlan && (
                    <DataCard icon={<span className="text-[11px]">📋</span>} label="Development plan (spec §8.5)">
                      <div className="text-sm font-semibold text-accent">{selected.rationale.developmentPlan.plannedProject}</div>
                      <div className="mt-1 flex gap-4 text-xs text-ink-muted">
                        <span>{selected.rationale.developmentPlan.approvedBudget}</span>
                        <span>{selected.rationale.developmentPlan.plannedTimeline}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-ink-muted">Source: {selected.rationale.developmentPlan.source}</div>
                    </DataCard>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border-subtle p-3">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-ink-muted">
                        <Radio className="h-3 w-3" /> Relay-submitted
                      </span>
                      <div className="mt-1 font-mono text-lg font-bold text-ink">
                        {Math.round(selected.relayShare * 100)}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-border-subtle p-3">
                      <span className="text-[11px] font-medium text-ink-muted">Affected</span>
                      <div className="mt-1 font-mono text-lg font-bold text-ink">
                        {selected.affected.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                      <Quote className="h-3.5 w-3.5" /> Submissions
                    </span>
                    <div className="mt-2 space-y-2">
                      {selected.sampleQuotes.slice(0, 3).map((q, i) => (
                        <p key={i} className="rounded-xl border border-border-subtle bg-cream px-3 py-2 text-xs italic text-ink-muted">
                          &ldquo;{q}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={up} className="mt-6">
          <div className="card overflow-hidden">
            <div className="border-b border-border-subtle px-6 py-4">
              <h2 className="text-lg font-bold text-ink">Ranked priority list</h2>
              <p className="text-sm text-ink-muted">Click a row to inspect on the map</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-cream text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    {["#", "Theme", "Ward", "Affected", "Status", "Score"].map((h) => (
                      <th key={h} className={`px-6 py-3 font-semibold ${h === "Score" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {clusters.map((c, i) => (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)}
                      className={`cursor-pointer transition-colors hover:bg-cream/80 ${
                        c.id === selectedId ? "bg-tag-orange-bg/50" : ""
                      }`}>
                      <td className="px-6 py-3 font-mono text-ink-muted">{i + 1}</td>
                      <td className="px-6 py-3 font-medium text-ink">{c.title}</td>
                      <td className="px-6 py-3 text-ink-muted">{c.ward}</td>
                      <td className="px-6 py-3 font-semibold text-ink">{c.affected.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                          <StatusDot status={c.status} /> {STATUS_META[c.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-accent">{c.score}</td>
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
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>{label}</span>
        <span className="font-semibold text-ink">+{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border-subtle">
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

function DataCard({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
}) {
  return (
    <div className="mt-4 space-y-1 rounded-2xl bg-cream p-4">
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
        {icon} {label}
      </span>
      {children}
    </div>
  );
}
