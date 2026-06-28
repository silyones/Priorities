// Frontend copy of the domain model (spec §3)
// Source of truth: backend/src/types.ts — keep in sync when extending.

export type Category =
  | "roads" | "water" | "sanitation" | "education"
  | "health" | "electricity" | "other";

export type Urgency   = "safety" | "high" | "normal";
export type Sentiment = "distressed" | "concerned" | "neutral" | "hopeful";
export type SourcePath = "self" | "relay";

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
  rationale: ScoreRationale;
  officeNote?: string;
  outcome?: string;
  publishedAt?: string;
  sanctionedProject?: string;
  gapNote?: string;
  geo: { x: number; y: number };
  sampleQuotes: string[];
  relayShare: number;
}

export interface ScoreRationale {
  demandComponent: number;
  urgencyComponent: number;
  dataComponent: number;
  dataset?: PublicDatasetHit;
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
