import type { Category, PublicDatasetHit } from "./types";

// Public / sample datasets (PRD 5.2.8) held separate from live submissions
// and JOINED against clusters at scoring time, never at write time.
// Every entry carries its citation for submission documentation (PRD 6.3).

interface DatasetRow {
  category: Category;
  ward: string;
  hit: PublicDatasetHit;
}

export const PUBLIC_DATASETS: DatasetRow[] = [
  {
    category: "education",
    ward: "Ward 3",
    hit: {
      name: "School Enrollment & Travel Distance",
      source: "UDISE+ 2023–24 (sample)",
      metric: "Nearest upper-primary school",
      value: "6.4 km away · 1,180 enrolled",
    },
  },
  {
    category: "water",
    ward: "Ward 12",
    hit: {
      name: "Piped Water Coverage",
      source: "Jal Jeevan Mission dashboard (sample)",
      metric: "Functional tap connections",
      value: "41% of households",
    },
  },
  {
    category: "sanitation",
    ward: "Ward 7",
    hit: {
      name: "Drainage & Flood-prone Index",
      source: "District DRR survey (sample)",
      metric: "Monsoon waterlogging events",
      value: "9 events / season",
    },
  },
  {
    category: "health",
    ward: "Ward 9",
    hit: {
      name: "PHC Catchment Load",
      source: "HMIS facility report (sample)",
      metric: "Population per sub-centre",
      value: "8,900 (norm: 5,000)",
    },
  },
  {
    category: "roads",
    ward: "Ward 5",
    hit: {
      name: "Rural Road Connectivity",
      source: "PMGSY habitation data (sample)",
      metric: "All-weather road access",
      value: "Partial · 2 habitations cut off in rain",
    },
  },
  {
    category: "electricity",
    ward: "Ward 14",
    hit: {
      name: "Feeder Reliability",
      source: "State DISCOM outage log (sample)",
      metric: "Avg. supply",
      value: "13.5 hrs/day",
    },
  },
];

export function joinDataset(category: Category, ward: string): PublicDatasetHit | undefined {
  const exact = PUBLIC_DATASETS.find((r) => r.category === category && r.ward === ward);
  if (exact) return exact.hit;
  return PUBLIC_DATASETS.find((r) => r.category === category)?.hit;
}
