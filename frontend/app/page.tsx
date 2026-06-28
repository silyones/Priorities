// Dashboard — fetches from backend API (spec §2.5: frontend never imports lib/store)
import { API_BASE } from "@/lib/api";
import type { Cluster } from "@/lib/types";
import { DashboardClient } from "@/components/DashboardClient";

async function getData() {
  try {
    const res = await fetch(`${API_BASE}/api/clusters`, { cache: "no-store" });
    const d   = await res.json();
    return { clusters: d.clusters as Cluster[], stats: d.stats };
  } catch {
    return { clusters: [] as Cluster[], stats: null };
  }
}

export default async function DashboardPage() {
  const { clusters, stats } = await getData();
  return <DashboardClient clusters={clusters} stats={stats} />;
}
