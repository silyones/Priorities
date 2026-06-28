// Server component — no client-side fetch
import { getShowcase, getStats } from "@/lib/store";
import { ShowcaseClient } from "@/components/ShowcaseClient";

export default function ShowcasePage() {
  const items = getShowcase();
  const stats = getStats();
  return <ShowcaseClient items={items} publishedCount={stats.published} />;
}
