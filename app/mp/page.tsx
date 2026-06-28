// Server component — passes initial deck as prop, no client fetch on load
import { getClusters } from "@/lib/store";
import { MpTriageClient } from "@/components/MpTriageClient";

export default function MpPage() {
  const initialDeck = getClusters().filter((c) => c.status !== "published");
  return <MpTriageClient initialDeck={initialDeck} />;
}
