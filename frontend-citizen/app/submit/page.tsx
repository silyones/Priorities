"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Check,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Reveal } from "@/components/motion";
import { API_BASE } from "@/lib/api";

function detectLanguage(text: string): string {
  if (/[ऀ-ॿ]/.test(text)) return "Hindi";
  if (/[஀-௿]/.test(text)) return "Tamil";
  if (/[ఀ-౿]/.test(text)) return "Telugu";
  if (/[ಀ-೿]/.test(text)) return "Kannada";
  if (/[ঀ-৿]/.test(text)) return "Bengali";
  return "English";
}

type Mode = "self" | "relay";

export default function SubmitPage() {
  const [mode, setMode] = useState<Mode>("self");
  const [issueTitle, setIssueTitle] = useState("");
  const [assistedPerson, setAssistedPerson] = useState("");
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [locality, setLocality] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualArea, setManualArea] = useState("");
  const [showManualArea, setShowManualArea] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [ack, setAck] = useState<{ language: string; joined: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIssueTitle("");
    setAssistedPerson("");
    setText("");
    setRole("");
    setLocality("");
    setPhotoFile(null);
    setPhotoPreviewUrl("");
    setCoords(null);
    setManualArea("");
    setShowManualArea(false);
    setStatus("idle");
    setAck(null);
  }

  function handlePhotoChange(file: File | null) {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl("");
      return;
    }
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function requestCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setShowManualArea(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setShowManualArea(false);
      },
      () => {
        setCoords(null);
        setShowManualArea(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AnimatePresence mode="wait">
        {status !== "done" ? (
          <>
            <div className="border-b border-border-subtle px-5 py-5 sm:px-8">
              <div className="mx-auto max-w-7xl">
                <h1 className="text-xl font-semibold text-ink">Submit a Voice</h1>
              </div>
            </div>
            <div className="container-pp py-8">
              <motion.div
                key="form"
                exit={{ opacity: 0, y: -20 }}
                className="mx-auto max-w-2xl"
              >
                <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
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
                            label="Who are you submitting for?"
                            placeholder="Their name (optional)"
                            value={assistedPerson}
                            onChange={setAssistedPerson}
                          />
                          <Field
                            label="Your role"
                            placeholder="e.g. Neighbor, family member, ASHA worker, volunteer"
                            value={role}
                            onChange={setRole}
                          />
                          <Field
                            label="Citizen's village / locality"
                            placeholder="Your village name"
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

                  <div className="mt-5">
                    <Field
                      label="What's this about?"
                      placeholder="e.g. Broken streetlight, no water supply, road full of potholes"
                      value={issueTitle}
                      onChange={setIssueTitle}
                      maxLength={80}
                    />
                    <p className="mt-1 text-xs text-ink-muted">Keep this short (max 80 characters).</p>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-ink">
                        {mode === "self" ? "Describe your issue" : "What did they describe?"}
                      </label>
                      <VoiceButton onTranscript={setText} />
                    </div>
                    <div className="relative">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                        placeholder={
                          mode === "self"
                            ? "Describe your issue"
                            : "Type what they told you, in their own words"
                        }
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/40"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Add photo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                      />

                      <button
                        type="button"
                        onClick={requestCurrentLocation}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/40"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Use my current location
                      </button>
                    </div>

                    {photoPreviewUrl && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-white p-2">
                        <img
                          src={photoPreviewUrl}
                          alt={photoFile?.name ?? "Selected upload"}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhotoChange(null)}
                          className="inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-1 text-xs text-ink-muted hover:text-ink"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    )}

                    {coords && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-white px-3 py-1.5 text-xs font-medium text-ink">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        Location added
                        <button
                          type="button"
                          onClick={() => {
                            setCoords(null);
                            setShowManualArea(true);
                          }}
                          className="text-ink-muted hover:text-ink"
                          aria-label="Clear location"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {showManualArea && !coords && (
                      <div className="mt-3">
                        <Field
                          label="Or type your area"
                          placeholder="e.g. Ward 7 main road, Rajgarh"
                          value={manualArea}
                          onChange={setManualArea}
                        />
                      </div>
                    )}
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
                    No tracking number, no status, no timeline. Just an honest acknowledgment.
                  </p>
                </form>
              </motion.div>
            </div>
          </>
        ) : (
          <Acknowledgment key="ack" ack={ack} onReset={reset} />
        )}
      </AnimatePresence>
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
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-5 py-16 text-center"
    >
      <div className="relative mb-10 flex h-28 w-28 items-center justify-center">
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
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-surface-white shadow-glow"
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
        <h2 className="display max-w-md text-3xl font-semibold text-ink sm:text-4xl">
          Your voice has been heard.
        </h2>
      </Reveal>
      <Reveal delay={0.3}>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-muted">
          It&apos;s been recorded{ack?.language ? ` in ${ack.language}` : ""} and is now part of a
          real pattern of demand{" "}
          {ack?.joined ? "— it joined others raising the same issue." : "in your constituency."}
        </p>
      </Reveal>

      <Reveal delay={0.4}>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border-subtle bg-surface-white px-5 py-4 text-sm text-ink-muted">
          <Check className="mx-auto mb-2 h-5 w-5 text-accent" />
          No tracking number, no status updates — just an honest acknowledgment. That&apos;s the
          only promise we make.
        </div>
      </Reveal>

      <Reveal delay={0.5}>
        <button onClick={onReset} className="btn-primary mt-10 px-8 py-4 text-base">
          Submit another voice
        </button>
      </Reveal>
    </motion.div>
  );
}
