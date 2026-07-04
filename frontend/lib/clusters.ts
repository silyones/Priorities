import { fetchWithTimeout } from "@/lib/api";
import type { Cluster } from "@/lib/types";

export interface ClusterStats {
  totalVoices: number;
  themes: number;
  wards: number;
  relayShare: number;
  published: number;
}

export async function fetchShowcase(): Promise<{
  items: Cluster[];
  publishedCount: number;
}> {
  try {
    const res = await fetchWithTimeout("/api/showcase", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch showcase (${res.status})`);
    const data = await res.json();
    const items = Array.isArray(data.items) ? (data.items as Cluster[]) : [];
    return { items, publishedCount: items.length };
  } catch {
    return { items: [], publishedCount: 0 };
  }
}

export async function fetchClusters(): Promise<{
  clusters: Cluster[];
  stats: ClusterStats | null;
}> {
  try {
    const res = await fetchWithTimeout("/api/clusters", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch clusters (${res.status})`);
    const data = await res.json();
    return {
      clusters: Array.isArray(data.clusters) ? data.clusters : [],
      stats: data.stats ?? null,
    };
  } catch {
    return { clusters: [], stats: null };
  }
}
