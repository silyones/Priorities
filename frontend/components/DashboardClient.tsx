"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight, Layers, Megaphone, FlaskConical,
  MapPin, AlertTriangle, CheckCircle2, Users, Radio, Map, TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import { fetchClusters } from "@/lib/clusters";
import { fetchSubmissionThemes, isLiveSubmissionCluster } from "@/lib/submissions";
import { StatusDot, UrgencyTag, STATUS_META } from "@/components/ui";

const up = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

interface Stats {
  totalVoices: number; themes: number; wards: number;
  relayShare: number; published: number;
}

export function DashboardClient() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [realThemes, setRealThemes] = useState<Cluster[]>([]);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const dummyThemes = clusters.filter((c) => c.status !== "published");
  const pending = [...realThemes, ...dummyThemes].sort((a, b) => b.score - a.score);
  const newThemes     = clusters.filter((c) => c.status === "new");
  const gapItems      = clusters.filter((c) => c.sanctionedProject);
  const showcaseItems = clusters.filter((c) => c.status === "published");

  useEffect(() => {
    fetchClusters()
      .then(({ clusters: loaded, stats: loadedStats }) => {
        setClusters(loaded);
        setStats(loadedStats);
      })
      .catch((err) => {
        console.error("Could not load clusters:", err);
      });

    fetchSubmissionThemes()
      .then(({ themes, error }) => {
        setRealThemes(themes);
        setSubmissionsError(error);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Could not load citizen submissions";
        console.error("Could not load citizen submissions:", err);
        setRealThemes([]);
        setSubmissionsError(message);
      });
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-cream"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      transition={{ duration: 0.4 }}
    >
      <motion.div variants={up} className="border-b border-border-subtle px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="label">People's Priorities · Bengaluru North Constituency</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Constituency Dashboard</h1>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-7xl space-y-4 px-5 py-6 sm:px-8">

        {submissionsError && (
          <motion.div
            variants={up}
            className="flex items-start gap-3 rounded-2xl border border-tag-red-text/30 bg-tag-red-bg px-4 py-3 text-sm text-tag-red-text"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Live citizen submissions could not be loaded</p>
              <p className="mt-0.5 text-xs text-tag-red-text/80">{submissionsError}</p>
              <p className="mt-1 text-xs text-tag-red-text/70">
                Demo themes below are still shown, but new Firestore submissions will not appear until this is fixed.
              </p>
            </div>
          </motion.div>
        )}

        <motion.div variants={up} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={<Users className="h-5 w-5" />} label="Voices counted"
            value={stats?.totalVoices.toLocaleString("en-IN") ?? "—"} accent="accent" />
          <StatTile icon={<TrendingUp className="h-5 w-5" />} label="Demand themes"
            value={stats?.themes ?? "—"} accent="teal" />
          <StatTile icon={<Map className="h-5 w-5" />} label="Wards mapped"
            value={stats?.wards ?? "—"} accent="ink" />
          <StatTile icon={<Radio className="h-5 w-5" />} label="Via relay"
            value={stats ? `${Math.round(stats.relayShare * 100)}%` : "—"} accent="rust" />
        </motion.div>

        <motion.div variants={up} className="grid gap-4 lg:grid-cols-3">

          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-ink-muted">Live ranking</p>
                <p className="mt-0.5 text-base font-bold text-ink">Priority themes</p>
              </div>
              <Link href="/insights"
                className="flex items-center gap-1 rounded-lg bg-cream px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-border-subtle hover:text-ink">
                Full analysis <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border-subtle">
              {pending.slice(0, 8).map((c, i) => {
                const rowClass =
                  "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-cream/60";
                const rowContent = (
                  <>
                    <span className="w-5 font-mono text-xs text-ink-muted/60">{i + 1}</span>
                    <StatusDot status={c.status} pulse={c.status === "new"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{c.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-0.5 text-xs text-ink-muted">
                          <MapPin className="h-3 w-3" /> {c.locality}
                        </span>
                        <UrgencyTag urgency={c.urgency} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-ink">
                          {c.affected.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-ink-muted">
                          {c.affected === 1 ? "voice" : "voices"}
                        </div>
                      </div>
                      <div className="w-8 rounded-lg bg-tag-orange-bg py-0.5 text-center font-mono text-sm font-bold text-tag-orange-text">
                        {c.score}
                      </div>
                    </div>
                  </>
                );

                return isLiveSubmissionCluster(c) ? (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.04, ease: "easeOut" }}
                  >
                    <Link href={`/issues/${c.id}`} className={`${rowClass} cursor-pointer`}>
                      {rowContent}
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.04, ease: "easeOut" }}
                    className={rowClass}
                  >
                    {rowContent}
                  </motion.div>
                );
              })}
            </div>

            <div className="border-t border-border-subtle bg-cream/50 px-5 py-3">
              <Link href="/mp"
                className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
                Open triage tool to action these themes
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">

            <div className="grid grid-cols-2 gap-3">
              <ActionTile href="/mp" icon={<Layers className="h-6 w-6" />}
                label="MP Triage" desc={`${newThemes.length} new themes`}
                className="bg-tag-teal-bg text-tag-teal-text" descClass="text-tag-teal-text/80" />
              <ActionTile href="/showcase" icon={<Megaphone className="h-6 w-6" />}
                label="Showcase" desc={`${showcaseItems.length} published`}
                className="bg-tag-pink-bg text-tag-pink-text" descClass="text-tag-pink-text/80" />
              <ActionTile href="/insights" icon={<FlaskConical className="h-6 w-6" />}
                label="Insights" desc="Hotspot map"
                className="bg-ink text-surface-white" descClass="text-white/60" />
            </div>

            {gapItems.length > 0 && (
              <div className="warning-banner rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    Demand gap — internal only
                  </p>
                </div>
                <div className="space-y-2">
                  {gapItems.map((c) => (
                    <div key={c.id} className="rounded-xl bg-surface-white/60 p-3">
                      <div className="text-sm font-semibold text-ink">{c.title}</div>
                      <div className="mt-0.5 text-xs text-accent">{c.sanctionedProject}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-ink-muted">Never published externally · MP view only</p>
              </div>
            )}

            {showcaseItems.length > 0 && (
              <div className="card flex-1">
                <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
                  <p className="text-sm font-bold text-ink">Recent outcomes</p>
                  <Link href="/showcase" className="text-xs font-medium text-accent hover:text-accent-hover">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-border-subtle">
                  {showcaseItems.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tag-teal-text" />
                      <div>
                        <div className="text-sm font-medium leading-snug text-ink">
                          {c.outcome ?? c.title}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-muted">
                          {c.affected.toLocaleString("en-IN")} residents · {c.locality}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={up}
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-subtle bg-surface-white px-5 py-3.5 text-xs"
        >
          <span className="font-bold uppercase tracking-widest text-ink-muted">Status</span>
          {(["new", "forwarded", "handling", "info", "published"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-ink-muted">
              <StatusDot status={s} />
              {STATUS_META[s].label}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatTile({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "accent" | "teal" | "ink" | "rust";
}) {
  const valueClass = {
    accent: "text-accent",
    teal:   "text-tag-teal-text",
    ink:    "text-ink",
    rust:   "text-tag-red-text",
  }[accent];
  return (
    <div className="card px-5 py-5">
      <div className={`flex items-center gap-1.5 ${valueClass}`}>
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      </div>
      <div className={`mt-3 font-mono text-3xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function ActionTile({ href, icon, label, desc, className, descClass }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  className: string;
  descClass: string;
}) {
  return (
    <Link href={href}
      className={`group flex flex-col justify-between rounded-2xl p-4 shadow-soft transition-all hover:-translate-y-0.5 ${className}`}
      style={{ minHeight: "110px" }}
    >
      <div className="flex items-start justify-between">
        <span>{icon}</span>
        <ArrowUpRight className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-80" />
      </div>
      <div>
        <div className="mt-3 text-sm font-bold leading-tight">{label}</div>
        <div className={`mt-0.5 text-xs ${descClass}`}>{desc}</div>
      </div>
    </Link>
  );
}
