// Server component
import { getClusters, getStats } from "@/lib/store";
import { InsightsClient } from "@/components/InsightsClient";

export default function InsightsPage() {
  const clusters = getClusters();
  const stats    = getStats();
  return <InsightsClient clusters={clusters} stats={stats} />;
}
