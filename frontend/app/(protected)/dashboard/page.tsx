// Dashboard — data loaded client-side so a slow backend never blocks SSR.
import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return <DashboardClient />;
}
