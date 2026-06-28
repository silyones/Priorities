"use client";

import { motion } from "framer-motion";
import { Printer, Users, CheckCircle2, Calendar } from "lucide-react";
import type { Cluster } from "@/lib/types";
import { CategoryBadge } from "@/components/ui";

const up = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

export function ShowcaseClient({ items, publishedCount }: {
  items: Cluster[];
  publishedCount: number;
}) {
  const totalServed = items.reduce((n, c) => n + c.affected, 0);

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
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="label">MP-approved · completed outcomes only</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Public Showcase</h1>
          </div>
          <button onClick={() => window.print()} className="btn-ghost hidden sm:inline-flex">
            <Printer className="h-4 w-4" /> Print noticeboard
          </button>
        </div>
      </motion.div>

      <div className="container-pp py-8">
        {/* Stats */}
        {items.length > 0 && (
          <motion.div variants={up} className="mb-8 flex gap-4">
            <div className="card px-6 py-5">
              <div className="font-mono text-3xl font-bold text-emerald-400">{publishedCount}</div>
              <div className="mt-1 text-xs text-white/40">Outcomes published</div>
            </div>
            <div className="card px-6 py-5">
              <div className="font-mono text-3xl font-bold text-emerald-400">
                {totalServed.toLocaleString("en-IN")}
              </div>
              <div className="mt-1 text-xs text-white/40">Residents served</div>
            </div>
          </motion.div>
        )}

        {/* Grid */}
        <motion.div variants={up} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <ShowcaseCard cluster={c} />
            </motion.div>
          ))}
        </motion.div>

        {items.length === 0 && (
          <div className="mt-20 text-center text-white/30">
            No outcomes published yet. Use the MP triage tool to publish completed work.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ShowcaseCard({ cluster }: { cluster: Cluster }) {
  return (
    <div className="card group relative h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl"
        style={{ background: "rgba(74,222,128,0.08)", transition: "background 0.3s" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <CategoryBadge category={cluster.category} />
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-emerald-400"
            style={{ background: "rgba(74,222,128,0.12)" }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        </div>
        <h3 className="mt-4 text-xl font-bold leading-snug text-white">
          {cluster.outcome ?? cluster.title}
        </h3>
        <p className="mt-3 text-sm text-white/50">
          Based on requests from{" "}
          <span className="font-semibold text-white/80">
            {cluster.affected.toLocaleString("en-IN")} residents
          </span>{" "}
          in {cluster.locality}.
        </p>
        <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-white/30"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
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
