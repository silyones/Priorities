"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { Cluster } from "@/lib/types";

export function PublishModal({
  cluster,
  onClose,
  onConfirm,
}: {
  cluster: Cluster | null;
  onClose: () => void;
  onConfirm: (outcome: string) => void;
}) {
  const [outcome, setOutcome] = useState("");

  return (
    <AnimatePresence>
      {cluster && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#1E2330", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-night-950">
                <Megaphone className="h-5 w-5" />
              </span>
              <button onClick={onClose} className="text-white/30 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">Publish a completed outcome</h3>
            <p className="mt-1.5 text-sm text-white/50">
              This will appear publicly, paired with the demand that justified it. Nothing pending or
              in-progress is ever shown.
            </p>

            <label className="mt-5 block text-sm font-semibold text-white/70">Outcome line</label>
            <input
              autoFocus
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Drain repaired and desilted before monsoon"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
            />

            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-sm text-emerald-300">
              <span className="font-semibold">Preview:</span>{" "}
              {outcome || "Your outcome"} — based on requests from{" "}
              {cluster.affected.toLocaleString("en-IN")} residents.
            </div>

            <div className="mt-5 flex gap-2">
              <button
                disabled={outcome.trim().length < 4}
                onClick={() => onConfirm(outcome.trim())}
                className="btn-accent flex-1 disabled:opacity-40"
              >
                Publish to showcase
              </button>
              <button onClick={onClose} className="btn-ghost">Cancel</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
