"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Printer, Users, CheckCircle2, Calendar, Loader2 } from "lucide-react";
import type { Cluster } from "@/lib/types";
import { CategoryBadge } from "@/components/ui";
import { Tag } from "@/components/ui/Tag";
import { patchIssueStatus } from "@/lib/issues";
import { fetchShowcase } from "@/lib/clusters";
import { isLiveSubmissionCluster } from "@/lib/submissions";

const up = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

export function ShowcaseClient() {
  const [items, setItems] = useState<Cluster[]>([]);
  const [publishedCount, setPublishedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadShowcase = useCallback(async () => {
    const { items: loaded, publishedCount: count } = await fetchShowcase();
    setItems(loaded);
    setPublishedCount(count);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

  const handleReopen = async (issueId: string) => {
    const result = await patchIssueStatus(issueId, "Open");
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setItems((prev) => prev.filter((c) => c.id !== issueId));
    setPublishedCount((n) => Math.max(0, n - 1));
  };

  const totalServed = items.reduce((n, c) => n + c.affected, 0);

  return (
    <motion.div
      className="min-h-screen bg-cream"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      transition={{ duration: 0.4 }}
    >
      <motion.div variants={up} className="border-b border-border-subtle px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="label">MP-approved · completed outcomes only</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">Public Showcase</h1>
          </div>
          <button onClick={() => window.print()} className="btn-ghost hidden sm:inline-flex">
            <Printer className="h-4 w-4" /> Print noticeboard
          </button>
        </div>
      </motion.div>

      <div className="container-pp py-8">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading showcase…
          </div>
        )}

        {!loading && items.length > 0 && (
          <motion.div variants={up} className="mb-8 flex gap-4">
            <div className="card px-6 py-5">
              <div className="font-mono text-3xl font-bold text-tag-teal-text">{publishedCount}</div>
              <div className="mt-1 text-xs text-ink-muted">Outcomes published</div>
            </div>
            <div className="card px-6 py-5">
              <div className="font-mono text-3xl font-bold text-tag-teal-text">
                {totalServed.toLocaleString("en-IN")}
              </div>
              <div className="mt-1 text-xs text-ink-muted">Residents served</div>
            </div>
          </motion.div>
        )}

        {!loading && (
          <>
            <motion.div variants={up} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <ShowcaseCard cluster={c} onReopen={handleReopen} />
                </motion.div>
              ))}
            </motion.div>

            {items.length === 0 && (
              <div className="mt-20 text-center text-ink-muted">
                No completed outcomes yet. Mark a live issue as Completed from its issue brief,
                or use the MP triage tool to publish demo outcomes.
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function ShowcaseCard({
  cluster,
  onReopen,
}: {
  cluster: Cluster;
  onReopen: (issueId: string) => Promise<void>;
}) {
  const [reopening, setReopening] = useState(false);
  const isLive = isLiveSubmissionCluster(cluster);

  const reopen = async () => {
    if (reopening) return;
    setReopening(true);
    try {
      await onReopen(cluster.id);
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="card group relative h-full overflow-hidden p-6 shadow-soft transition-all duration-300 hover:-translate-y-1">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-tag-teal-bg blur-3xl transition-all group-hover:bg-tag-teal-bg/80" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <CategoryBadge category={cluster.category} />
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isLive && (
              <button
                type="button"
                onClick={reopen}
                disabled={reopening}
                className="rounded-md border border-border-subtle bg-cream/90 px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-ink-muted hover:text-ink disabled:opacity-60"
              >
                {reopening ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Reopening…
                  </span>
                ) : (
                  "Reopen issue"
                )}
              </button>
            )}
            <Tag color="teal">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </Tag>
          </div>
        </div>
        <h3 className="mt-4 text-xl font-bold leading-snug text-ink">
          {cluster.outcome ?? cluster.title}
        </h3>
        <p className="mt-3 text-sm text-ink-muted">
          Based on requests from{" "}
          <span className="font-semibold text-ink">
            {cluster.affected.toLocaleString("en-IN")} residents
          </span>{" "}
          in {cluster.locality}.
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-4 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {cluster.ward}
          </span>
          {cluster.publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(cluster.publishedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
