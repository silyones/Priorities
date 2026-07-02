"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mic, MicOff } from "lucide-react";
import { transcribeSpeech } from "@/lib/transcribe";

const MAX_RECORDING_MS = 30_000;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
  return types.find((t) => MediaRecorder.isTypeSupported(t));
}

export function VoiceButton({
  onTranscript,
  labels,
}: {
  onTranscript: (text: string) => void;
  labels?: {
    listening: string;
    micDenied: string;
    notSupported: string;
    speak: string;
    transcribing: string;
  };
}) {
  const t = labels ?? {
    listening: "Listening… tap to stop",
    micDenied: "Microphone access denied. Type your issue instead.",
    notSupported: "Voice not supported here — type instead",
    speak: "Speak",
    transcribing: "Transcribing…",
  };
  const [phase, setPhase] = useState<"idle" | "recording" | "processing">("idle");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ok =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    setSupported(ok);
  }, []);

  const cleanupStream = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setPhase("processing");

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        resolve(new Blob(chunksRef.current, { type: mime }));
      };
      recorder.stop();
    });

    cleanupStream();

    try {
      const result = await transcribeSpeech(blob);
      onTranscript(result.transcript);
      setError(null);
      setPhase("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
      setPhase("idle");
    }
  }, [cleanupStream, onTranscript]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      setPhase("recording");

      stopTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
    } catch {
      cleanupStream();
      setError(t.micDenied);
      setPhase("idle");
    }
  }, [cleanupStream, stopRecording]);

  const toggle = () => {
    if (phase === "processing") return;
    if (phase === "recording") void stopRecording();
    else void startRecording();
  };

  if (!supported) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
        <MicOff className="h-3.5 w-3.5" /> {t.notSupported}
      </span>
    );
  }

  const listening = phase === "recording";
  const processing = phase === "processing";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={processing}
        className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-70 ${
          listening
            ? "bg-accent-hover text-surface-white"
            : "bg-accent text-surface-white hover:bg-accent-hover"
        }`}
      >
        {listening && (
          <motion.span
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <span className="relative flex items-center gap-2">
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {processing ? t.transcribing : listening ? t.listening : t.speak}
        </span>
      </button>
      {error && <p className="max-w-[14rem] text-right text-xs text-tag-red-text">{error}</p>}
    </div>
  );
}
