import type { Cluster, StructuredRecord } from "../types";

// EMBEDDING + CLUSTERING LAYER (PRD 4.3 / 5.2.3)
// Many similarly-worded complaints collapse into ONE ranked theme.
//
// Production swap: replace `embed()` with a real embeddings API call and the
// cosine-similarity match below stays identical. The deterministic bag-of-words
// vector here keeps the prototype runnable without keys while preserving the
// exact "match new submission against existing clusters by similarity" logic.

const STOP = new Set([
  "the", "a", "an", "is", "are", "to", "of", "in", "on", "at", "and", "for",
  "we", "our", "my", "i", "it", "this", "that", "near", "no", "not", "has",
  "have", "been", "from", "with", "please", "there", "here",
]);

export function embed(text: string): Map<string, number> {
  const vec = new Map<string, number>();
  text
    .toLowerCase()
    .replace(/[^a-zऀ-ൿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .forEach((w) => vec.set(w, (vec.get(w) ?? 0) + 1));
  return vec;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  a.forEach((v) => (na += v * v));
  b.forEach((v, k) => {
    nb += v * v;
    if (a.has(k)) dot += v * (a.get(k) as number);
  });
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const SIMILARITY_THRESHOLD = 0.18;

export interface ClusterMatch {
  cluster: Cluster | null;
  similarity: number;
}

// Match a new structured submission against existing clusters.
// Same category + same location is a strong signal; text similarity refines it.
export function matchCluster(
  text: string,
  structured: StructuredRecord,
  clusters: Cluster[],
  clusterCorpus: Map<string, Map<string, number>>,
): ClusterMatch {
  const v = embed(text);
  let best: Cluster | null = null;
  let bestSim = 0;
  for (const c of clusters) {
    if (c.category !== structured.category) continue;
    const corpus = clusterCorpus.get(c.id) ?? new Map();
    let sim = cosine(v, corpus);
    // location agreement boost
    if (c.ward.toLowerCase() === structured.location.toLowerCase()) sim += 0.25;
    if (sim > bestSim) {
      bestSim = sim;
      best = c;
    }
  }
  if (best && bestSim >= SIMILARITY_THRESHOLD) return { cluster: best, similarity: bestSim };
  return { cluster: null, similarity: bestSim };
}
