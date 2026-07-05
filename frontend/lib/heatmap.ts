import { fetchWithTimeout } from "@/lib/api";

export interface HeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  title: string;
  status: string;
}

export async function fetchIssueHeatmap(): Promise<{
  items: HeatmapPoint[];
  error: string | null;
}> {
  try {
    const res = await fetchWithTimeout("/api/issues/heatmap", { cache: "no-store" });
    if (!res.ok) {
      return { items: [], error: `Failed to load heatmap data (${res.status})` };
    }
    const data = (await res.json()) as { items?: HeatmapPoint[] };
    const items = Array.isArray(data.items) ? data.items : [];
    return { items, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load heatmap data";
    return { items: [], error: message };
  }
}
