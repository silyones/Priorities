import type { Cluster, ClusterStatus, Submission, SourcePath } from "./types";
import { buildSeedClusters } from "./seed";
import { structureSubmission } from "./ai/structure";
import { embed, matchCluster } from "./ai/cluster";
import { scoreCluster } from "./ai/score";

// In-memory store (PRD 5.5 — managed document/analytical DB at real scale).
// Held on globalThis so it survives Next.js dev hot-reloads and is shared
// across API route invocations within a single server process.

interface Store {
  clusters: Cluster[];
  submissions: Submission[];
  corpus: Map<string, Map<string, number>>; // clusterId -> aggregated embedding
  seq: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __pp_store: Store | undefined;
}

function seedCorpus(clusters: Cluster[]): Map<string, Map<string, number>> {
  const corpus = new Map<string, Map<string, number>>();
  for (const c of clusters) {
    const agg = new Map<string, number>();
    const seedText = `${c.title} ${c.locality} ${c.sampleQuotes.join(" ")}`;
    embed(seedText).forEach((v, k) => agg.set(k, (agg.get(k) ?? 0) + v));
    corpus.set(c.id, agg);
  }
  return corpus;
}

function init(): Store {
  const clusters = buildSeedClusters();
  return { clusters, submissions: [], corpus: seedCorpus(clusters), seq: 0 };
}

function store(): Store {
  if (!globalThis.__pp_store) globalThis.__pp_store = init();
  return globalThis.__pp_store;
}

export function getClusters(): Cluster[] {
  // ranked highest priority first; published items sink to the bottom of triage
  return [...store().clusters].sort((a, b) => {
    if (a.status === "published" && b.status !== "published") return 1;
    if (b.status === "published" && a.status !== "published") return -1;
    return b.score - a.score;
  });
}

export function getCluster(id: string): Cluster | undefined {
  return store().clusters.find((c) => c.id === id);
}

export function getShowcase(): Cluster[] {
  return store()
    .clusters.filter((c) => c.status === "published")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export interface SubmitInput {
  rawText: string;
  source: SourcePath;
  relayWorkerRole?: string;
  locality?: string;
}

export interface SubmitResult {
  submission: Submission;
  joinedExisting: boolean;
  cluster: Cluster;
}

// Full ingestion → structuring → clustering → scoring pipeline for one
// citizen voice (PRD 5.3 Data Flow Summary).
export function submit(input: SubmitInput): SubmitResult {
  const s = store();
  const structured = structureSubmission(input.rawText, input.locality);

  const match = matchCluster(input.rawText, structured, s.clusters, s.corpus);
  let cluster: Cluster;
  let joinedExisting = false;

  if (match.cluster) {
    // join existing theme, increment affected count, rescore
    cluster = match.cluster;
    cluster.affected += 1;
    if (input.source === "relay") {
      cluster.relayShare = Math.min(1, cluster.relayShare + 0.5 / cluster.affected);
    }
    const re = scoreCluster(cluster);
    cluster.score = re.score;
    cluster.rationale = re.rationale;
    joinedExisting = true;
  } else {
    // genuinely new issue → new cluster
    const id = `c-live-${++s.seq}`;
    const ward = /^ward/i.test(structured.location) ? structured.location : "Ward 11";
    const base = {
      id,
      title: makeTitle(structured.category, ward),
      category: structured.category,
      ward,
      locality: input.locality || structured.location,
      affected: 1,
      urgency: structured.urgency,
      status: "new" as ClusterStatus,
      geo: { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 },
      relayShare: input.source === "relay" ? 1 : 0,
      sampleQuotes: [input.rawText.slice(0, 160)],
    };
    const re = scoreCluster(base);
    cluster = { ...base, score: re.score, rationale: re.rationale };
    s.clusters.push(cluster);
  }

  // update the cluster's aggregated embedding corpus
  const agg = s.corpus.get(cluster.id) ?? new Map<string, number>();
  embed(input.rawText).forEach((v, k) => agg.set(k, (agg.get(k) ?? 0) + v));
  s.corpus.set(cluster.id, agg);

  const submission: Submission = {
    id: `sub-${Date.now()}-${s.seq}`,
    rawText: input.rawText,
    source: input.source,
    relayWorkerRole: input.relayWorkerRole,
    locality: input.locality,
    createdAt: new Date().toISOString(),
    structured,
    clusterId: cluster.id,
  };
  s.submissions.push(submission);

  return { submission, joinedExisting, cluster };
}

export interface ActionInput {
  status?: Exclude<ClusterStatus, "published">;
  officeNote?: string;
  publish?: { outcome: string };
  gapNote?: string;
}

export function actOnCluster(id: string, action: ActionInput): Cluster | undefined {
  const c = getCluster(id);
  if (!c) return undefined;
  if (action.status) c.status = action.status;
  if (action.officeNote !== undefined) c.officeNote = action.officeNote;
  if (action.gapNote !== undefined) c.gapNote = action.gapNote;
  if (action.publish) {
    c.status = "published";
    c.outcome = action.publish.outcome;
    c.publishedAt = new Date().toISOString().slice(0, 10);
  }
  return c;
}

function makeTitle(category: string, ward: string): string {
  const label: Record<string, string> = {
    roads: "Road & connectivity need",
    water: "Drinking water need",
    sanitation: "Sanitation & drainage need",
    education: "Education need",
    health: "Health access need",
    electricity: "Electricity need",
    other: "Community need",
  };
  return `${label[category] ?? "Community need"}, ${ward}`;
}

export function getStats() {
  const s = store();
  const clusters = s.clusters;
  const totalVoices = clusters.reduce((n, c) => n + c.affected, 0);
  return {
    totalVoices,
    themes: clusters.length,
    published: clusters.filter((c) => c.status === "published").length,
    wards: new Set(clusters.map((c) => c.ward)).size,
    relayShare:
      clusters.reduce((n, c) => n + c.relayShare * c.affected, 0) / Math.max(1, totalVoices),
  };
}
