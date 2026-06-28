import type { Cluster, ScoreRationale, Urgency } from "../types";
import { joinDataset } from "../datasets";

// DEMAND-vs-DATA PRIORITY SCORING (PRD 4.4 / 5.2.4)
// score = demand (cluster size) + urgency signal + public-dataset evidence.
// Recalculated whenever a cluster's size or status changes.

const URGENCY_WEIGHT: Record<Urgency, number> = {
  safety: 25,
  high: 15,
  normal: 6,
};

// Smooth, saturating demand curve so 340 doesn't dwarf everything linearly.
function demandComponent(affected: number): number {
  return Math.round(Math.min(55, 12 * Math.log10(affected + 1) * 2.2));
}

export function scoreCluster(c: Pick<Cluster, "affected" | "urgency" | "category" | "ward">): {
  score: number;
  rationale: ScoreRationale;
} {
  const demand = demandComponent(c.affected);
  const urgency = URGENCY_WEIGHT[c.urgency];
  const datasetHit = joinDataset(c.category, c.ward);
  const dataComponent = datasetHit ? 20 : 0;
  const score = Math.min(100, demand + urgency + dataComponent);
  return {
    score,
    rationale: {
      demandComponent: demand,
      urgencyComponent: urgency,
      dataComponent,
      dataset: datasetHit,
    },
  };
}
