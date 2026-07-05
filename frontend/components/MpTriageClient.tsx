"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Coffee,
  Forward,
  Hand,
  HelpCircle,
} from "lucide-react";
import type { Cluster } from "@/lib/types";
import { TriageCard, type TriageAction } from "@/components/TriageCard";
import { PublishModal } from "@/components/PublishModal";
import { API_BASE } from "@/lib/api";
import { fetchClusters } from "@/lib/clusters";
import {
  fetchSubmissionThemes,
  isLiveSubmissionCluster,
} from "@/lib/submissions";
import { patchIssueStatus } from "@/lib/issues";

export function MpTriageClient() {
  const [deck, setDeck] = useState<Cluster[]>([]);
  const [actedCount, setActedCount] = useState(0);
  const [publishTarget, setPublishTarget] = useState<Cluster | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const total = useMemo(() => deck.length + actedCount, [deck.length, actedCount]);

  const loadDeck = useCallback(async () => {
    const [clustersResult, submissionsResult] = await Promise.all([
      fetchClusters(),
      fetchSubmissionThemes(),
    ]);

    const dummyDeck = clustersResult.clusters.filter((c) => c.status !== "published");
    setDeck([...submissionsResult.themes, ...dummyDeck]);
    setSubmissionsError(submissionsResult.error);
  }, []);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  function patchCluster(cluster: Cluster, body: Record<string, unknown>) {
    if (isLiveSubmissionCluster(cluster)) return;

    fetch(`${API_BASE}/api/clusters/${cluster.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  function handleAction(action: TriageAction) {
    setDeck((d) => {
      if (d.length === 0) return d;
      const [top, ...rest] = d;
      patchCluster(top, { status: action });
      return rest;
    });
    setActedCount((c) => c + 1);
  }

  function handleNote(note: string) {
    setDeck((d) => {
      if (d.length === 0) return d;
      const top = d[0];
      if (!isLiveSubmissionCluster(top)) {
        patchCluster(top, { officeNote: note });
      }
      return [{ ...top, officeNote: note }, ...d.slice(1)];
    });
  }

  async function confirmPublish(outcome: string) {
    if (!publishTarget || publishing) return;
    setPublishing(true);
    setPublishError(null);

    if (isLiveSubmissionCluster(publishTarget)) {
      const result = await patchIssueStatus(publishTarget.id, "Completed", { outcome });
      if (!result.ok) {
        setPublishError(result.error);
        setPublishing(false);
        return;
      }
    } else {
      patchCluster(publishTarget, { publish: { outcome } });
    }

    setDeck((d) => d.filter((c) => c.id !== publishTarget.id));
    setActedCount((c) => c + 1);
    setPublishTarget(null);
    setPublishing(false);
  }

  const done = deck.length === 0;

  return (
    <motion.div
      className="min-h-screen bg-cream"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="border-b border-border-subtle px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="label">One ranked theme per card</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">MP Triage Tool</h1>
        </div>
      </div>

      <div className="container-pp py-8">
        {submissionsError && (
          <div className="mx-auto mb-6 flex max-w-md items-start gap-3 rounded-2xl border border-tag-red-text/30 bg-tag-red-bg px-4 py-3 text-sm text-tag-red-text">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Live citizen submissions could not be loaded</p>
              <p className="mt-0.5 text-xs text-tag-red-text/80">{submissionsError}</p>
              <p className="mt-1 text-xs text-tag-red-text/70">
                Demo triage cards below are still shown, but new Firestore submissions will not
                appear until this is fixed.
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-md">
          {total > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5 text-accent" />
                  {actedCount} actioned this session
                </span>
                <span>{deck.length} remaining</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-subtle">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-tag-teal-text"
                  animate={{ width: `${(actedCount / total) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative mx-auto mt-6 h-[560px] max-w-md">
          {!done && (
            <>
              {deck.slice(0, 3).map((c, i) => (
                <TriageCard
                  key={c.id}
                  cluster={c}
                  index={i}
                  onAction={handleAction}
                  onNote={handleNote}
                  onPublish={() => setPublishTarget(c)}
                />
              )).reverse()}
            </>
          )}

          {done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tag-teal-bg">
                <CheckCircle2 className="h-8 w-8 text-tag-teal-text" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-ink">All caught up</h2>
              <p className="mt-2 text-sm text-ink-muted">
                {actedCount} themes actioned — each carries a record of activity.
                Published outcomes appear on the showcase.
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    setActedCount(0);
                    void loadDeck();
                  }}
                  className="btn-ghost"
                >
                  <RotateCcw className="h-4 w-4" /> Reload deck
                </button>
                <a href="/showcase" className="btn-accent">View showcase</a>
              </div>
            </motion.div>
          )}
        </div>

        {!done && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-5 text-[11px] font-medium text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" /> ← need info
            </span>
            <span className="inline-flex items-center gap-1">
              <Hand className="h-3.5 w-3.5" /> ↑ handling
            </span>
            <span className="inline-flex items-center gap-1">
              forward → <Forward className="h-3.5 w-3.5" />
            </span>
          </div>
        )}
      </div>

      <PublishModal
        cluster={publishTarget}
        onClose={() => {
          if (publishing) return;
          setPublishTarget(null);
          setPublishError(null);
        }}
        onConfirm={confirmPublish}
        publishing={publishing}
        error={publishError}
      />
    </motion.div>
  );
}
