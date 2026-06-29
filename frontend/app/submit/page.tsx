"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Reveal } from "@/components/motion";
import { API_BASE } from "@/lib/api";

// detectLanguage is the one sanctioned frontend/backend code share (spec §2.5)
// — a pure, side-effect-free function for live UX feedback only.
function detectLanguage(text: string): string {
  if (/[ऀ-ॿ]/.test(text)) return "Hindi";
  if (/[஀-௿]/.test(text)) return "Tamil";
  if (/[ఀ-౿]/.test(text)) return "Telugu";
  if (/[ಀ-೿]/.test(text)) return "Kannada";
  if (/[ঀ-৿]/.test(text)) return "Bengali";
  return "English";
}

const EXAMPLES = [
  "The drain near the primary school in Ward 7 floods every monsoon and children wade through dirty water.",
  "नाली टूटी है, बारिश में घर के सामने गंदा पानी भर जाता है, स्कूल के बच्चे परेशान हैं।",
  "Children walk 6 km to the nearest upper-primary school; many girls drop out before class 8.",
  "Power cuts every evening when children study, and the voltage keeps damaging our appliances.",
];

type Mode = "self" | "relay";

export default function SubmitPage() {
  const [mode, setMode] = useState<Mode>("self");
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [locality, setLocality] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [ack, setAck] = useState<{ language: string; joined: boolean } | null>(null);

  const language = useMemo(() => (text.trim() ? detectLanguage(text) : null), [text]);
  const canSubmit = text.trim().length > 8 && status !== "sending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text, source: mode, relayWorkerRole: role, locality }),
      });
      const data = await res.json();
      setAck({ language: data.detectedLanguage ?? "English", joined: !!data.joinedExisting });
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  }

  function reset() {
    setText("");
    setRole("");
    setLocality("");
    setStatus("idle");
    setAck(null);
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="border-b border-border-subtle px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-semibold text-ink">Submit a Voice</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Type or speak in any language · self-submit or relay on behalf of someone</p>
        </div>
      </div>
      <div className="container-pp py-8">
        <AnimatePresence mode="wait">
          {status !== "done" ? (
            <motion.div
              key="form"
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto max-w-2xl"
            >
              <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
                  {/* mode toggle */}
                  <div className="relative grid grid-cols-2 gap-1 rounded-2xl bg-cream p-1">
                    <ModeTab
                      active={mode === "self"}
                      onClick={() => setMode("self")}
                      icon={<User className="h-4 w-4" />}
                      label="For myself"
                    />
                    <ModeTab
                      active={mode === "relay"}
                      onClick={() => setMode("relay")}
                      icon={<Users className="h-4 w-4" />}
                      label="For someone else"
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {mode === "relay" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <Field
                            label="Your role"
                            placeholder="e.g. ASHA worker, panchayat secretary"
                            value={role}
                            onChange={setRole}
                          />
                          <Field
                            label="Citizen's village / locality"
                            placeholder="e.g. Subhash Nagar, Ward 7"
                            value={locality}
                            onChange={setLocality}
                          />
                        </div>
                        <p className="mt-2 text-xs text-ink-muted">
                          Relay submissions are flagged for transparency, then processed identically
                          — no second-class data path.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* textarea */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-ink">
                        {mode === "relay" ? "What did they describe?" : "Describe the need"}
                      </label>
                      <VoiceButton onTranscript={setText} />
                    </div>
                    <div className="relative">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                        placeholder="Type here, or tap “Speak instead”. Any language is fine — we detect it automatically."
                        className="w-full resize-none rounded-2xl border border-border-subtle bg-cream p-4 text-[15px] leading-relaxed text-ink outline-none transition-all placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
                      />
                      <AnimatePresence>
                        {language && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="pill absolute bottom-3 right-3"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-tag-teal-text" />
                            Detected: {language}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* example chips */}
                  <div className="mt-4">
                    <span className="text-xs font-medium text-ink-muted">Try an example:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {EXAMPLES.map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setText(ex)}
                          className="max-w-full truncate rounded-full border border-border-subtle bg-cream px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-ink"
                          style={{ maxWidth: "100%" }}
                        >
                          {ex.length > 46 ? ex.slice(0, 46) + "…" : ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={!canSubmit} className="btn-primary mt-7 w-full disabled:opacity-40">
                    {status === "sending" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending your voice…
                      </>
                    ) : (
                      <>
                        Submit my voice <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    No tracking number, no status, no timeline — just an honest acknowledgment.
                  </p>
                </form>
            </motion.div>
          ) : (
            <Acknowledgment key="ack" ack={ack} onReset={reset} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
        active ? "text-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="mode-pill"
          className="absolute inset-0 -z-10 rounded-xl bg-surface-white shadow-soft"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border-subtle bg-cream px-3.5 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
      />
    </label>
  );
}

function Acknowledgment({
  ack,
  onReset,
}: {
  ack: { language: string; joined: boolean } | null;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex max-w-lg flex-col items-center pt-6 text-center"
    >
      {/* animated check with expanding rings */}
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full bg-tag-teal-bg"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          />
        ))}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-tag-teal-text text-surface-white shadow-glow-teal"
        >
          <motion.svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            />
          </motion.svg>
        </motion.div>
      </div>

      <Reveal delay={0.2}>
        <h2 className="display text-3xl font-semibold text-ink">Your voice has been heard.</h2>
      </Reveal>
      <Reveal delay={0.3}>
        <p className="mt-3 text-ink-muted">
          It&apos;s been recorded{ack?.language ? ` in ${ack.language}` : ""} and is now part of a
          real, visible pattern of demand{" "}
          {ack?.joined ? "— it joined others raising the same issue." : "in your constituency."}
        </p>
      </Reveal>

      <Reveal delay={0.4}>
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-tag-teal-bg px-4 py-3 text-sm text-tag-teal-text">
          <Check className="h-4 w-4 shrink-0" />
          That&apos;s the only promise we make — and one we&apos;ll always keep.
        </div>
      </Reveal>

      <Reveal delay={0.5}>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={onReset} className="btn-primary">
            Raise another voice
          </button>
          <a href="/showcase" className="btn-ghost">
            See outcomes others helped create
          </a>
        </div>
      </Reveal>
    </motion.div>
  );
}
