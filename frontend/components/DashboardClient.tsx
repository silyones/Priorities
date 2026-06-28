"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight, Mic, Layers, Megaphone, FlaskConical,
  MapPin, AlertTriangle, CheckCircle2, Users, Radio, Map, TrendingUp,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import { StatusDot, UrgencyTag, STATUS_META } from "@/components/ui";

const up = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

interface Stats {
  totalVoices: number; themes: number; wards: number;
  relayShare: number; published: number;
}

export function DashboardClient({
  clusters,
  stats,
}: {
  clusters: Cluster[];
  stats: Stats | null;
}) {
  const pending       = clusters.filter((c) => c.status !== "published");
  const newThemes     = clusters.filter((c) => c.status === "new");
  const gapItems      = clusters.filter((c) => c.sanctionedProject);
  const showcaseItems = clusters.filter((c) => c.status === "published");

  return (
    <motion.div
      className="min-h-screen"
      style={{ background: "#0D0F14" }}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Page header ─────────────────────────────────────────── */}
      <motion.div
        variants={up}
        className="border-b px-5 py-5 sm:px-8"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="label">People's Priorities · Rajgarh Constituency</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Constituency Dashboard</h1>
          </div>
          <Link href="/submit" className="btn-accent hidden sm:inline-flex">
            <Mic className="h-4 w-4" /> Submit a voice
          </Link>
        </div>
      </motion.div>

      <div className="mx-auto max-w-7xl space-y-4 px-5 py-6 sm:px-8">

        {/* ── Stat tiles ──────────────────────────────────────────── */}
        <motion.div variants={up} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={<Users className="h-5 w-5" />} label="Voices counted"
            value={stats?.totalVoices.toLocaleString("en-IN") ?? "—"} accent="amber" />
          <StatTile icon={<TrendingUp className="h-5 w-5" />} label="Demand themes"
            value={stats?.themes ?? "—"} accent="jade" />
          <StatTile icon={<Map className="h-5 w-5" />} label="Wards mapped"
            value={stats?.wards ?? "—"} accent="white" />
          <StatTile icon={<Radio className="h-5 w-5" />} label="Via relay"
            value={stats ? `${Math.round(stats.relayShare * 100)}%` : "—"} accent="coral" />
        </motion.div>

        {/* ── Main bento ──────────────────────────────────────────── */}
        <motion.div variants={up} className="grid gap-4 lg:grid-cols-3">

          {/* Priority themes — 2 cols */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-white/40">Live ranking</p>
                <p className="mt-0.5 text-base font-bold text-white">Priority themes</p>
              </div>
              <Link href="/insights"
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                Full analysis <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {pending.slice(0, 8).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, ease: "easeOut" }}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="w-5 font-mono text-xs text-white/25">{i + 1}</span>
                  <StatusDot status={c.status} pulse={c.status === "new"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{c.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-0.5 text-xs text-white/40">
                        <MapPin className="h-3 w-3" /> {c.locality}
                      </span>
                      <UrgencyTag urgency={c.urgency} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-white">
                        {c.affected.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-white/30">voices</div>
                    </div>
                    <div className="w-8 rounded-lg py-0.5 text-center font-mono text-sm font-bold text-amber-400"
                      style={{ background: "rgba(245,197,24,0.12)" }}>
                      {c.score}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="border-t px-5 py-3"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              <Link href="/mp"
                className="flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-white">
                Open triage tool to action these themes
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Action tiles */}
            <div className="grid grid-cols-2 gap-3">
              <ActionTile href="/submit" icon={<Mic className="h-6 w-6" />}
                label="Submit Voice" desc="Type or speak" bg="#F5C518" fg="#0D0F14" descColor="#3a3000" />
              <ActionTile href="/mp" icon={<Layers className="h-6 w-6" />}
                label="MP Triage" desc={`${newThemes.length} new themes`} bg="#4ADE80" fg="#0D0F14" descColor="#1a4a2a" />
              <ActionTile href="/showcase" icon={<Megaphone className="h-6 w-6" />}
                label="Showcase" desc={`${showcaseItems.length} published`} bg="#F87171" fg="#0D0F14" descColor="#4a1010" />
              <ActionTile href="/insights" icon={<FlaskConical className="h-6 w-6" />}
                label="Insights" desc="Hotspot map" bg="#1E2330" fg="#F1F3F7" descColor="rgba(255,255,255,0.4)" />
            </div>

            {/* Demand gap */}
            {gapItems.length > 0 && (
              <div className="rounded-2xl border p-4"
                style={{ borderColor: "rgba(245,197,24,0.2)", background: "rgba(245,197,24,0.05)" }}>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    Demand gap — internal only
                  </p>
                </div>
                <div className="space-y-2">
                  {gapItems.map((c) => (
                    <div key={c.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="text-sm font-semibold text-white">{c.title}</div>
                      <div className="mt-0.5 text-xs text-amber-400/80">{c.sanctionedProject}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-white/30">Never published externally · MP view only</p>
              </div>
            )}

            {/* Recent outcomes */}
            {showcaseItems.length > 0 && (
              <div className="card flex-1">
                <div className="flex items-center justify-between border-b px-4 py-3.5"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="text-sm font-bold text-white">Recent outcomes</p>
                  <Link href="/showcase" className="text-xs font-medium text-amber-400 hover:text-amber-300">
                    View all →
                  </Link>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {showcaseItems.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <div>
                        <div className="text-sm font-medium leading-snug text-white">
                          {c.outcome ?? c.title}
                        </div>
                        <div className="mt-0.5 text-xs text-white/40">
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

        {/* ── Status legend ───────────────────────────────────────── */}
        <motion.div
          variants={up}
          className="flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-3.5 text-xs"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <span className="font-bold uppercase tracking-widest text-white/30">Status</span>
          {(["new", "forwarded", "handling", "info", "published"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-white/50">
              <StatusDot status={s} />
              {STATUS_META[s].label}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────── */

function StatTile({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "amber" | "jade" | "coral" | "white";
}) {
  const color = { amber: "#F5C518", jade: "#4ADE80", coral: "#F87171", white: "#ffffff" }[accent];
  return (
    <div className="card px-5 py-5">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className="mt-3 font-mono text-3xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function ActionTile({ href, icon, label, desc, bg, fg, descColor }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  bg: string;
  fg: string;
  descColor: string;
}) {
  return (
    <Link href={href}
      className="group flex flex-col justify-between rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{ background: bg, color: fg, minHeight: "110px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-start justify-between">
        <span>{icon}</span>
        <ArrowUpRight className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-80" />
      </div>
      <div>
        <div className="mt-3 text-sm font-bold leading-tight">{label}</div>
        <div className="mt-0.5 text-xs" style={{ color: descColor }}>{desc}</div>
      </div>
    </Link>
  );
}
