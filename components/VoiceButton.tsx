"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

// Voice capture via the browser Web Speech API (PRD 4.1.1 voice input).
// Transcribes speech to text client-side; falls back gracefully when the API
// is unavailable. In production this is where a managed Speech-to-Text call sits.
export function VoiceButton({
  onTranscript,
  lang = "en-IN",
}: {
  onTranscript: (text: string) => void;
  lang?: string;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      onTranscript((finalText + interim).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {}
    }
  };

  if (!supported) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-400">
        <MicOff className="h-3.5 w-3.5" /> Voice not supported here — type instead
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
        listening ? "bg-rose-500 text-white" : "btn-ghost"
      }`}
    >
      {listening && (
        <motion.span
          className="absolute inset-0 rounded-full bg-rose-400"
          animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      <span className="relative flex items-center gap-2">
        <Mic className="h-4 w-4" />
        {listening ? "Listening… tap to stop" : "Speak instead"}
      </span>
    </button>
  );
}
