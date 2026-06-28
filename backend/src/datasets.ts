// Public Dataset Layer (spec §4.6, §8.3, §8.4, §8.5)
// Joined at scoring time only — never at write time.
// Each table carries explicit citations (spec §11.3).

import type {
  Category, PublicDatasetHit, DemographicHit, DevelopmentPlanHit,
} from "./types";

// ── §8.3 Public / Infrastructure Dataset Table ────────────────────────────────
// One row per category+ward. Falls back to category-only match if ward not found.
interface DatasetRow {
  category: Category;
  ward: string;
  name: string;
  source: string;
  metric: string;
  value: string;
}

export const PUBLIC_DATASETS: DatasetRow[] = [
  {
    category: "education", ward: "Ward 3",
    name: "School Enrollment & Travel Distance",
    source: "UDISE+ 2023–24 (sample)",
    metric: "Nearest upper-primary school",
    value: "6.4 km away · 1,180 enrolled",
  },
  {
    category: "water", ward: "Ward 12",
    name: "Piped Water Coverage",
    source: "Jal Jeevan Mission dashboard (sample)",
    metric: "Functional tap connections",
    value: "41% of households",
  },
  {
    category: "sanitation", ward: "Ward 7",
    name: "Drainage & Flood-prone Index",
    source: "District DRR survey (sample)",
    metric: "Monsoon waterlogging events",
    value: "9 per season",
  },
  {
    category: "health", ward: "Ward 9",
    name: "PHC Catchment Load",
    source: "HMIS facility report (sample)",
    metric: "Population per sub-centre",
    value: "8,900 against norm of 5,000",
  },
  {
    category: "roads", ward: "Ward 5",
    name: "Rural Road Connectivity",
    source: "PMGSY habitation data (sample)",
    metric: "All-weather access",
    value: "Partial — 2 habitations cut off in rain",
  },
  {
    category: "electricity", ward: "Ward 14",
    name: "Feeder Reliability",
    source: "State DISCOM outage log (sample)",
    metric: "Average supply",
    value: "13.5 hours/day",
  },
];

// Join: exact category+ward first, then category-only fallback (spec §8.3)
export function joinDataset(
  category: Category, ward: string,
): PublicDatasetHit | undefined {
  const exact = PUBLIC_DATASETS.find(
    (r) => r.category === category && r.ward === ward,
  );
  if (exact) return exact;
  const fallback = PUBLIC_DATASETS.find((r) => r.category === category);
  return fallback;
}

// ── §8.4 Demographic Dataset Table ───────────────────────────────────────────
// Keyed by ward only — applies to every cluster in that ward (spec §1.4.1)
const DEMOGRAPHIC_DATASETS: DemographicHit[] = [
  {
    ward: "Ward 7",  population: 18400, literacyRate: "71%",
    predominantOccupation: "Daily-wage and informal trade",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 3",  population: 12900, literacyRate: "64%",
    predominantOccupation: "Agricultural labour",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 12", population: 9600,  literacyRate: "58%",
    predominantOccupation: "Agricultural labour",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 5",  population: 4100,  literacyRate: "52%",
    predominantOccupation: "Agricultural and pastoral",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 9",  population: 7800,  literacyRate: "61%",
    predominantOccupation: "Mixed agricultural and service",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 14", population: 21200, literacyRate: "79%",
    predominantOccupation: "Industrial and factory work",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 10", population: 8900,  literacyRate: "65%",
    predominantOccupation: "Mixed service and informal trade",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 11", population: 6200,  literacyRate: "62%",
    predominantOccupation: "Agricultural labour",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
  {
    ward: "Ward 13", population: 9100,  literacyRate: "67%",
    predominantOccupation: "Mixed agricultural and service",
    source: "Census 2021 projected ward-level estimate (sample)",
  },
];

export function joinDemographics(ward: string): DemographicHit | undefined {
  return DEMOGRAPHIC_DATASETS.find((r) => r.ward === ward);
}

// ── §8.5 Local Development Plan Dataset ──────────────────────────────────────
// Keyed by ward. Auto-populates sanctionedProject on clusters (spec §1.4.2)
export const LOCAL_DEVELOPMENT_PLANS: DevelopmentPlanHit[] = [
  {
    ward: "Ward 7",  plannedProject: "Community hall construction",
    approvedBudget: "₹38 lakh", plannedTimeline: "FY 2025–26, Q3",
    source: "District Development Plan, sample line items (sample)",
  },
  {
    ward: "Ward 3",  plannedProject: "Anganwadi building renovation",
    approvedBudget: "₹12 lakh", plannedTimeline: "FY 2025–26, Q2",
    source: "District Development Plan, sample line items (sample)",
  },
  {
    ward: "Ward 12", plannedProject: "Overhead water tank",
    approvedBudget: "₹22 lakh", plannedTimeline: "FY 2026–27, Q1",
    source: "District Development Plan, sample line items (sample)",
  },
  {
    ward: "Ward 5",  plannedProject: "Culvert and approach road",
    approvedBudget: "₹45 lakh", plannedTimeline: "FY 2026–27, Q2",
    source: "District Development Plan, sample line items (sample)",
  },
  {
    ward: "Ward 9",  plannedProject: "Sub-centre staff quarters",
    approvedBudget: "₹16 lakh", plannedTimeline: "FY 2025–26, Q4",
    source: "District Development Plan, sample line items (sample)",
  },
  {
    ward: "Ward 14", plannedProject: "Feeder upgrade and transformer replacement",
    approvedBudget: "₹29 lakh", plannedTimeline: "FY 2026–27, Q1",
    source: "District Development Plan, sample line items (sample)",
  },
];

// Returns the sanctionedProject string for a ward, or undefined (spec §1.4.2)
export function lookupDevelopmentPlan(ward: string): DevelopmentPlanHit | undefined {
  return LOCAL_DEVELOPMENT_PLANS.find((r) => r.ward === ward);
}
