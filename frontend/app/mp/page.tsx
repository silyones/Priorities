import { API_BASE } from "@/lib/api";
import type { Cluster } from "@/lib/types";
import { MpTriageClient } from "@/components/MpTriageClient";

export default async function MpPage() {
  let initialDeck: Cluster[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/clusters`, { cache: "no-store" });
    const d   = await res.json();
    initialDeck = (d.clusters as Cluster[]).filter((c) => c.status !== "published");
  } catch {}
  return <MpTriageClient initialDeck={initialDeck} />;
}
