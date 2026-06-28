import { API_BASE } from "@/lib/api";
import type { Cluster } from "@/lib/types";
import { ShowcaseClient } from "@/components/ShowcaseClient";

export default async function ShowcasePage() {
  let items: Cluster[] = [];
  let publishedCount = 0;
  try {
    const res = await fetch(`${API_BASE}/api/showcase`, { cache: "no-store" });
    const d   = await res.json();
    items = d.items as Cluster[];
    publishedCount = items.length;
  } catch {}
  return <ShowcaseClient items={items} publishedCount={publishedCount} />;
}
