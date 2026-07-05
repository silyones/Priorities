"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Gauge, Loader2, MapPin, Quote, Radio } from "lucide-react";
import type { Cluster } from "@/lib/types";
import { IssueHeatmap } from "@/components/IssueHeatmap";
import { IssueStatusPill } from "@/components/IssueStatusPill";
import { fetchSubmissionThemes } from "@/lib/submissions";
import { CategoryBadge, UrgencyTag } from "@/components/ui";

const up = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function InsightsClient() {
  const [themes, setThemes] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ranked = useMemo(
    () => [...themes].sort((a, b) => b.score - a.score),
    [themes],
  );

  const selected = useMemo(
    () => ranked.find((c) => c.id === selectedId) ?? null,
    [ranked, selectedId],
  );

  const stats = useMemo(() => {
    const totalVoices = themes.reduce((sum, t) => sum + t.affected, 0);
    const relayVoices = themes.reduce((sum, t) => sum + t.affected * t.relayShare, 0);
    const localities = new Set(
      themes.map((t) => t.locality).filter((l) => l && l !== "Location not provided"),
    );
    return {
      totalVoices,
      themes: themes.length,
      localities: localities.size,
      relayShare: totalVoices > 0 ? relayVoices / totalVoices : 0,
    };
  }, [themes]);

  useEffect(() => {
    fetchSubmissionThemes()
      .then(({ themes: loaded, error: fetchError }) => {
        setThemes(loaded);
        setError(fetchError);
        if (loaded.length > 0) {
          const top = [...loaded].sort((a, b) => b.score - a.score)[0];
          setSelectedId(top.id);
        }
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Could not load citizen submissions";
        setThemes([]);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

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
        {error && (
          <motion.div
            variants={up}
            className="mb-6 flex items-start gap-3 rounded-2xl border border-tag-red-text/30 bg-tag-red-bg px-4 py-3 text-sm text-tag-red-text"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Live citizen data could not be loaded</p>
              <p className="mt-0.5 text-xs text-tag-red-text/80">{error}</p>
            </div>
          </motion.div>
        )}

        <motion.div variants={up} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Voices counted", value: loading ? "—" : stats.totalVoices.toLocaleString("en-IN") },
            { label: "Demand themes", value: loading ? "—" : stats.themes },
            { label: "Localities", value: loading ? "—" : stats.localities },
            {
              label: "Via relay",
              value: loading ? "—" : `${Math.round(stats.relayShare * 100)}%`,
            },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="font-mono text-2xl font-bold text-ink">{s.value}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={up} className="mt-6">
          <div className="card p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Live · Firestore issues</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Citizen issue heatmap</h2>
              </div>
              <p className="text-xs text-ink-muted">Bengaluru · weighted by voices</p>
            </div>
            <IssueHeatmap />
          </div>
        </motion.div>

        <motion.div variants={up} className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="card overflow-hidden">
              <div className="border-b border-border-subtle px-6 py-4">
                <h2 className="text-lg font-bold text-ink">Ranked priority list</h2>
                <p className="text-sm text-ink-muted">Top 5 live citizen themes · click a row to inspect</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading themes…
                </div>
              ) : ranked.length === 0 ? (
                <p className="px-6 py-16 text-center text-sm text-ink-muted">
                  No citizen submissions yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-cream text-xs uppercase tracking-wider text-ink-muted">
                      <tr>
                        {["#", "Theme", "Locality", "Affected", "Status", "Score"].map((h) => (
                          <th
                            key={h}
                            className={`px-6 py-3 font-semibold ${h === "Score" ? "text-right" : ""}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {ranked.slice(0, 5).map((c, i) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={`cursor-pointer transition-colors hover:bg-cream/80 ${
                            c.id === selectedId ? "bg-tag-orange-bg/50" : ""
                          }`}
                        >
                          <td className="px-6 py-3 font-mono text-ink-muted">{i + 1}</td>
                          <td className="px-6 py-3 font-medium text-ink">{c.title}</td>
                          <td className="px-6 py-3 text-ink-muted">{c.locality}</td>
                          <td className="px-6 py-3 font-semibold text-ink">
                            {c.affected.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-3">
                            {c.issueStatus ? (
                              <IssueStatusPill status={c.issueStatus} />
                            ) : (
                              <span className="text-xs text-ink-muted">Open</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-bold text-accent">
                            {c.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="card h-full p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <CategoryBadge category={selected.category} />
                    {selected.issueStatus && <IssueStatusPill status={selected.issueStatus} />}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-ink">{selected.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {selected.locality}
                    </span>
                    <UrgencyTag urgency={selected.urgency} />
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Gauge className="h-4 w-4 text-accent" /> Priority score
                    </span>
                    <span className="font-mono text-2xl font-bold text-accent">{selected.score}</span>
                  </div>

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

                  {selected.sampleQuotes.length > 0 && (
                    <div className="mt-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                        <Quote className="h-3.5 w-3.5" /> Submissions
                      </span>
                      <div className="mt-2 space-y-2">
                        {selected.sampleQuotes.slice(0, 3).map((q, i) => (
                          <p
                            key={i}
                            className="rounded-xl border border-border-subtle bg-cream px-3 py-2 text-xs italic text-ink-muted"
                          >
                            &ldquo;{q}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/issues/${selected.id}`}
                    className="btn-ghost mt-5 w-full justify-center text-sm"
                  >
                    Open issue brief
                  </Link>
                </motion.div>
              ) : (
                !loading && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="card flex h-full min-h-[280px] items-center justify-center p-6 text-center text-sm text-ink-muted"
                  >
                    Select a theme from the list to inspect it.
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
