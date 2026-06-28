// Demand-vs-Data Priority Scoring Layer (spec §6.4)
// Formula: score = demandComponent + urgencyComponent + dataComponent (cap 100)

import type { Cluster, ScoreRationale } from "../types";
import { joinDataset, joinDemographics, lookupDevelopmentPlan } from "../datasets";

// spec §6.4 — logarithmic demand curve capped at 55
function demandComponent(affected: number): number {
  return Math.round(Math.min(55, 12 * Math.log10(affected + 1) * 2.2));
}

const URGENCY_WEIGHT: Record<string, number> = {
  safety: 25,
  high:   15,
  normal:  6,
};

export function scoreCluster(
  c: Pick<Cluster, "affected" | "urgency" | "category" | "ward">,
): { score: number; rationale: ScoreRationale } {
  const demand   = demandComponent(c.affected);
  const urgency  = URGENCY_WEIGHT[c.urgency] ?? 6;
  const dataset  = joinDataset(c.category, c.ward);
  const dataComp = dataset ? 20 : 0;

  const score = Math.min(100, demand + urgency + dataComp);

  // Extended rationale (spec §3.5 + §1.4) — shown only in judge view
  const demographic    = joinDemographics(c.ward);
  const devPlan        = lookupDevelopmentPlan(c.ward);

  const rationale: ScoreRationale = {
    demandComponent: demand,
    urgencyComponent: urgency,
    dataComponent: dataComp,
    ...(dataset     && { dataset }),
    ...(demographic && { demographic }),
    ...(devPlan     && { developmentPlan: devPlan }),
  };

  return { score, rationale };
}
