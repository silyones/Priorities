"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useState } from "react";
import { Forward, Hand, HelpCircle, MapPin, Users, Plus, Check } from "lucide-react";
import type { Cluster } from "@/lib/types";
import { CategoryBadge, StatusDot, STATUS_META, UrgencyTag } from "./ui";
import { Counter } from "./motion";

export type TriageAction = "forwarded" | "handling" | "info";

export function TriageCard({
  cluster,
  index,
  onAction,
  onNote,
  onPublish,
}: {
  cluster: Cluster;
  index: number;
  onAction: (a: TriageAction) => void;
  onNote: (note: string) => void;
  onPublish: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const forwardOp  = useTransform(x, [20, 140],  [0, 1]);
  const infoOp     = useTransform(x, [-140, -20],[1, 0]);
  const handlingOp = useTransform(y, [-140, -20],[1, 0]);

  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(cluster.officeNote ?? "");
  const [showInternal, setShowInternal] = useState(false);

  const isTop = index === 0;

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x > 120 || velocity.x > 600) return onAction("forwarded");
    if (offset.x < -120 || velocity.x < -600) return onAction("info");
    if (offset.y < -120 || velocity.y < -600) return onAction("handling");
  }

  return (
    <motion.div
      style={{ x, y, rotate, zIndex: 30 - index }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.92, y: 28, opacity: 0 }}
      animate={{ scale: 1 - index * 0.04, y: index * 14, opacity: index < 3 ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
      className={`absolute inset-x-0 top-0 ${isTop ? "cursor-grab" : "pointer-events-none"}`}
    >
      <div
        className="relative overflow-hidden rounded-2xl p-6 shadow-lift"
        style={{ background: "#1E2330", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* swipe stamps */}
        <motion.div
          style={{ opacity: forwardOp }}
          className="pointer-events-none absolute right-5 top-5 rotate-12 rounded-xl border-2 border-amber-400 px-3 py-1 text-sm font-bold uppercase tracking-wide text-amber-400"
        >
          Forward
        </motion.div>
        <motion.div
          style={{ opacity: infoOp }}
          className="pointer-events-none absolute left-5 top-5 -rotate-12 rounded-xl border-2 border-orange-400 px-3 py-1 text-sm font-bold uppercase tracking-wide text-orange-400"
        >
          Need info
        </motion.div>
        <motion.div
          style={{ opacity: handlingOp }}
          className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-xl border-2 border-emerald-400 px-3 py-1 text-sm font-bold uppercase tracking-wide text-emerald-400"
        >
          Handling
        </motion.div>

        <div className="flex items-center justify-between">
          <CategoryBadge category={cluster.category} />
          <span className="flex items-center gap-2 text-xs font-medium text-white/50">
            <StatusDot status={cluster.status} pulse={cluster.status === "new"} />
            {STATUS_META[cluster.status].label}
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-bold leading-tight text-white">
          {cluster.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {cluster.locality}
          </span>
          <UrgencyTag urgency={cluster.urgency} />
        </div>

        {/* big number */}
        <div
          className="mt-5 flex items-end justify-between rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-white">
                <Counter to={cluster.affected} />
              </span>
              <Users className="h-5 w-5 text-white/30" />
            </div>
            <div className="mt-0.5 text-xs font-medium text-white/40">citizens affected</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-amber-400">{cluster.score}</div>
            <div className="text-xs font-medium text-white/40">priority</div>
          </div>
        </div>

        {/* demand-vs-sanctioned (PRD 4.9) */}
        {cluster.sanctionedProject && (
          <button
            type="button"
            onClick={() => setShowInternal((v) => !v)}
            className="mt-3 w-full rounded-xl border border-dashed border-white/15 px-3 py-2 text-left text-xs text-white/40 transition-colors hover:border-amber-500/40 hover:text-white/60"
          >
            {showInternal ? (
              <span className="text-white/70">
                Top demand: <b>{cluster.title.toLowerCase()}</b> · Sanctioned nearby:{" "}
                <b>{cluster.sanctionedProject}</b>. Internal only.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Show demand vs sanction gap
              </span>
            )}
          </button>
        )}

        {/* office note */}
        {cluster.officeNote && !noteOpen && (
          <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs italic text-amber-300">
            "{cluster.officeNote}"
          </p>
        )}

        {noteOpen ? (
          <div className="mt-4">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Raised in block meeting last week"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={() => { onNote(note); setNoteOpen(false); }} className="btn-accent !py-2 text-xs">
                <Check className="h-3.5 w-3.5" /> Save note
              </button>
              <button onClick={() => setNoteOpen(false)} className="btn-ghost !py-2 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNoteOpen(true)}
            className="mt-3 text-xs font-medium text-white/30 hover:text-white/60"
          >
            {cluster.officeNote ? "Edit office note" : "+ Attach a one-line office note"}
          </button>
        )}

        {/* three positive actions */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <ActionBtn onClick={() => onAction("info")}      icon={<HelpCircle className="h-4 w-4" />} label="Need info" tone="amber"   />
          <ActionBtn onClick={() => onAction("handling")}  icon={<Hand      className="h-4 w-4" />} label="Handling"  tone="emerald" />
          <ActionBtn onClick={() => onAction("forwarded")} icon={<Forward   className="h-4 w-4" />} label="Forward"   tone="sky"     />
        </div>

        <button
          onClick={onPublish}
          className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-night-950 transition-all hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-glow"
        >
          Mark complete &amp; publish to showcase →
        </button>
      </div>
    </motion.div>
  );
}

function ActionBtn({ onClick, icon, label, tone }: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "amber" | "emerald" | "sky";
}) {
  const tones = {
    amber:   "hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-500/30",
    emerald: "hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30",
    sky:     "hover:bg-teal-500/15 hover:text-teal-300 hover:border-teal-500/30",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/50 transition-all active:scale-95 ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}
