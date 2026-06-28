import type { Category, StructuredRecord, Sentiment, Urgency } from "../types";

// AI STRUCTURING LAYER (PRD 4.2 / 5.2.2)
// Converts unstructured citizen language into a structured record.
//
// This is a deterministic, dependency-free implementation so the prototype
// runs and demos with zero API keys. The function signature is the exact seam
// where a Gemini structured-output call would drop in for a real deployment:
//
//   export async function structureSubmission(text: string) {
//     const res = await gemini.generateContent({ ...structuredOutputPrompt(text) });
//     return JSON.parse(res.text) as StructuredRecord;
//   }

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  // English + romanized + common Devanagari terms so multilingual intake
  // classifies (and therefore clusters) correctly without a translation step.
  roads: ["road", "pothole", "street", "highway", "bridge", "transport", "bus", "footpath", "sadak", "सड़क", "रास्ता", "गड्ढा", "पुल"],
  water: ["water", "tap", "pipe", "borewell", "well", "drinking", "supply", "pani", "tanker", "पानी", "नल", "पीने", "बोरवेल", "टैंकर"],
  sanitation: ["drain", "drainage", "sewage", "garbage", "toilet", "waste", "flood", "waterlog", "naali", "gutter", "नाली", "गंदा", "कचरा", "सीवर", "बाढ़", "शौचालय"],
  education: ["school", "teacher", "college", "student", "classroom", "education", "vocational", "skill", "anganwadi", "padhai", "स्कूल", "विद्यालय", "शिक्षक", "पढ़ाई", "आंगनवाड़ी"],
  health: ["hospital", "clinic", "phc", "doctor", "medicine", "health", "ambulance", "dispensary", "aspataal", "अस्पताल", "दवा", "डॉक्टर", "स्वास्थ्य", "एम्बुलेंस"],
  electricity: ["electric", "power", "light", "transformer", "voltage", "outage", "current", "bijli", "feeder", "बिजली", "लाइट", "बत्ती", "ट्रांसफार्मर"],
  other: [],
};

const SAFETY_WORDS = ["danger", "accident", "death", "child", "school", "collapse", "shock", "drown", "snake", "fire", "risk", "unsafe", "emergency"];
const HIGH_WORDS = ["urgent", "immediately", "months", "years", "repeatedly", "again", "still", "every day", "worse"];

// Lightweight script-based language detection (no external service needed).
const SCRIPTS: { label: string; re: RegExp }[] = [
  { label: "Hindi", re: /[ऀ-ॿ]/ },
  { label: "Tamil", re: /[஀-௿]/ },
  { label: "Telugu", re: /[ఀ-౿]/ },
  { label: "Kannada", re: /[ಀ-೿]/ },
  { label: "Bengali", re: /[ঀ-৿]/ },
  { label: "Marathi", re: /[ऀ-ॿ]/ },
];

export function detectLanguage(text: string): string {
  for (const s of SCRIPTS) if (s.re.test(text)) return s.label;
  return "English";
}

function detectCategory(text: string): Category {
  const t = text.toLowerCase();
  let best: Category = "other";
  let bestScore = 0;
  (Object.keys(CATEGORY_KEYWORDS) as Category[]).forEach((cat) => {
    const score = CATEGORY_KEYWORDS[cat].reduce((n, kw) => (t.includes(kw) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  });
  return best;
}

function detectUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  if (SAFETY_WORDS.some((w) => t.includes(w))) return "safety";
  if (HIGH_WORDS.some((w) => t.includes(w))) return "high";
  return "normal";
}

function detectSentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  if (/(suffer|terrible|fear|scared|crying|helpless|desperate)/.test(t)) return "distressed";
  if (/(worried|concern|problem|issue|trouble|difficult)/.test(t)) return "concerned";
  if (/(hope|please|request|kindly|grateful|thank)/.test(t)) return "hopeful";
  return "neutral";
}

const WARD_RE = /\bward\s*(no\.?\s*)?(\d{1,2})\b/i;

export function detectLocation(text: string, fallbackLocality?: string): string {
  const m = text.match(WARD_RE);
  if (m) return `Ward ${m[2]}`;
  // Capture a "near/at/in <Place>" reference if present.
  const near = text.match(/\b(?:near|at|in|behind|opposite)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  if (near) return near[1];
  return fallbackLocality?.trim() || "Unspecified";
}

export function structureSubmission(text: string, fallbackLocality?: string): StructuredRecord {
  return {
    category: detectCategory(text),
    location: detectLocation(text, fallbackLocality),
    urgency: detectUrgency(text),
    sentiment: detectSentiment(text),
    language: detectLanguage(text),
  };
}
