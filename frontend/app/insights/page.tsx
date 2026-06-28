import { API_BASE } from "@/lib/api";
import type { Cluster } from "@/lib/types";
import { InsightsClient } from "@/components/InsightsClient";

export default async function InsightsPage() {
  let clusters: Cluster[] = [];
  let stats = null;
  try {
    const res = await fetch(`${API_BASE}/api/clusters`, { cache: "no-store" });
    const d   = await res.json();
    clusters = d.clusters as Cluster[];
    stats    = d.stats;
  } catch {}
  return <InsightsClient clusters={clusters} stats={stats} />;
}
