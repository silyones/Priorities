// Domain model — the single source of truth (spec §3)
// Every backend file imports from here. Frontend uses a copy at frontend/lib/types.ts.

export type Category =
  | "roads" | "water" | "sanitation" | "education"
  | "health" | "electricity" | "other";

export type Urgency   = "safety" | "high" | "normal";
export type Sentiment = "distressed" | "concerned" | "neutral" | "hopeful";
export type SourcePath = "self" | "relay";

// No "pending", "overdue", or "unresolved" — Principle 1 enforced at schema level (spec §3.1)
export type ClusterStatus =
  | "new" | "forwarded" | "handling" | "info" | "published";

export interface Submission {
  id: string;
  rawText: string;
  source: SourcePath;
  relayWorkerRole?: string;
  locality?: string;
  createdAt: string;
  structured: StructuredRecord;
  clusterId: string;
  // NOTE: no status, resolvedAt, daysOpen (spec §3.2)
}

export interface StructuredRecord {
  category: Category;
  location: string;
  urgency: Urgency;
  sentiment: Sentiment;
  language: string;
}

export interface Cluster {
  id: string;
  title: string;
  category: Category;
  ward: string;
  locality: string;
  affected: number;
  urgency: Urgency;
  status: ClusterStatus;
  score: number;
  rationale: ScoreRationale;  // judge/technical view ONLY — never MP daily view
  officeNote?: string;
  outcome?: string;           // only when published
  publishedAt?: string;
  sanctionedProject?: string; // internal only (spec §6.9)
  gapNote?: string;
  geo: { x: number; y: number };  // 0..100 canvas coords for HotspotMap
  sampleQuotes: string[];
  relayShare: number;         // 0..1
}

// Extended per spec §3.5 + §1.4 to include demographic and developmentPlan
export interface ScoreRationale {
  demandComponent: number;    // 0..55
  urgencyComponent: number;   // 0..25
  dataComponent: number;      // 0 or 20
  dataset?: PublicDatasetHit;
  // New fields (spec §1.4, §8.4, §8.5) — shown only in insights view
  demographic?: DemographicHit;
  developmentPlan?: DevelopmentPlanHit;
}

export interface PublicDatasetHit {
  name: string;
  source: string;
  metric: string;
  value: string;
}

export interface DemographicHit {
  ward: string;
  population: number;
  literacyRate: string;
  predominantOccupation: string;
  source: string;
}

export interface DevelopmentPlanHit {
  ward: string;
  plannedProject: string;
  approvedBudget: string;
  plannedTimeline: string;
  source: string;
}
