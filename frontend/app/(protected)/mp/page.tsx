// MP Triage — data loaded client-side so a slow backend never blocks SSR.
import { MpTriageClient } from "@/components/MpTriageClient";

export default function MpPage() {
  return <MpTriageClient />;
}
