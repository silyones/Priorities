// Core domain types for People's Priorities.
// One backend, many skins (PRD Principle 6) — every surface reads these shapes.

export type Category =
  | "roads"
  | "water"
  | "sanitation"
  | "education"
  | "health"
  | "electricity"
  | "other";

export type Urgency = "safety" | "high" | "normal";
export type Sentiment = "distressed" | "concerned" | "neutral" | "hopeful";
export type SourcePath = "self" | "relay";

// The status a cluster can hold. Note: NONE of these encode time-pending,
// backlog, or inaction (PRD Principle 1 — never expose failure).
export type ClusterStatus =
  | "new" // a fresh theme, not yet touched
  | "forwarded" // forwarded to a department
  | "handling" // MP office already handling
  | "info" // needs more information
  | "published"; // completed + approved for the public showcase

// A single raw citizen submission as it lands in the ingestion layer.
export interface Submission {
  id: string;
  rawText: string;
  source: SourcePath;
  // relay metadata, only present when source === "relay"
  relayWorkerRole?: string;
  locality?: string;
  createdAt: string;
  // structured fields produced by the AI structuring layer
  structured: StructuredRecord;
  clusterId: string;
}

// Output of the AI Structuring Layer (PRD 4.2 / 5.2.2).
export interface StructuredRecord {
  category: Category;
  location: string;
  urgency: Urgency;
  sentiment: Sentiment;
  language: string; // human-readable detected language label
}

// A semantic theme cluster (PRD 4.3 / 5.2.3) with its score (4.4 / 5.2.4).
export interface Cluster {
  id: string;
  title: string; // plain-language theme, e.g. "Drainage repair, Ward 7"
  category: Category;
  ward: string;
  locality: string;
  affected: number; // citizens affected (cluster size)
  urgency: Urgency;
  status: ClusterStatus;
  score: number; // 0..100 priority score
  // scoring rationale — surfaced ONLY in the judge/technical view (4.8)
  rationale: ScoreRationale;
  officeNote?: string; // optional one-line office note (4.5)
  // showcase fields, populated only when published (4.6)
  outcome?: string;
  publishedAt?: string;
  // demand-vs-sanctioned juxtaposition, internal only (4.9)
  sanctionedProject?: string;
  gapNote?: string;
  // geo for the hotspot map (4.8 / 5.2.5)
  geo: { x: number; y: number };
  sampleQuotes: string[];
  relayShare: number; // 0..1 fraction of submissions via relay path
}

export interface ScoreRationale {
  demandComponent: number;
  urgencyComponent: number;
  dataComponent: number;
  dataset?: PublicDatasetHit;
}

// A row from the Data & Public Dataset Layer (PRD 5.2.8) joined at scoring time.
export interface PublicDatasetHit {
  name: string;
  source: string;
  metric: string;
  value: string;
}
