// Server component — reads the store directly, no client-side fetch
import { getClusters, getStats } from "@/lib/store";
import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  const clusters = getClusters();
  const stats    = getStats();
  return <DashboardClient clusters={clusters} stats={stats} />;
}
