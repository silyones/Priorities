"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Megaphone, Inbox, Layers, Gauge, CheckCircle2 } from "lucide-react";

// Scroll-linked pipeline: the vertical connector "fills" as you scroll,
// and each stage reveals in turn. Mirrors PRD 5.3 data-flow summary.
const STAGES = [
  {
    icon: Inbox,
    name: "Ingestion",
    desc: "Voice or text, self or relay — every voice normalises to plain text.",
    io: "Citizen voice → raw record",
  },
  {
    icon: Sparkles,
    name: "AI structuring",
    desc: "A generative model extracts category, location, urgency, sentiment & language.",
    io: "Raw text → structured JSON",
  },
  {
    icon: Layers,
    name: "Clustering",
    desc: "Embeddings collapse 340 worded-differently complaints into one ranked theme.",
    io: "Records → themes + counts",
  },
  {
    icon: Gauge,
    name: "Scoring",
    desc: "Demand × urgency × real public data → an objective priority ranking.",
    io: "Themes + data → ranked list",
  },
  {
    icon: CheckCircle2,
    name: "MP action",
    desc: "One glance, one tap. Forward, handling, or need-info — never inaction.",
    io: "Ranked list → action",
  },
  {
    icon: Megaphone,
    name: "Public showcase",
    desc: "Only completed, approved outcomes — each paired with the demand it answered.",
    io: "Approved work → public proof",
  },
];

export function PipelineFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 60%"],
  });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mx-auto max-w-3xl">
      {/* connector track */}
      <div className="absolute left-[27px] top-4 bottom-4 w-0.5 rounded bg-ink-100 md:left-1/2 md:-translate-x-1/2" />
      <motion.div
        style={{ height: fill }}
        className="absolute left-[27px] top-4 w-0.5 rounded bg-gradient-to-b from-forest-500 to-clay-400 md:left-1/2 md:-translate-x-1/2"
      />

      <div className="space-y-6">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const left = i % 2 === 0;
          return (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex items-start gap-4 md:w-1/2 ${
                left ? "md:pr-10" : "md:ml-auto md:flex-row-reverse md:pl-10 md:text-right"
              }`}
            >
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-paper-50 shadow-lift ring-1 ring-ink-100">
                <Icon className="h-6 w-6 text-forest-600" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="card flex-1 p-4">
                <div className={`flex items-center gap-2 ${left ? "" : "md:justify-end"}`}>
                  <h4 className="display text-base font-bold text-ink-900">{s.name}</h4>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{s.desc}</p>
                <span className="pill mt-3">{s.io}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
