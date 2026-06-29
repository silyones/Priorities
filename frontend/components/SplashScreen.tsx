"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["Voices", "Demand", "Action"];

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("pp_splash_done")) return;
    setVisible(true);

    const wordTimer = setInterval(() => {
      setWordIndex((i) => i + 1);
    }, 500);

    const dismissTimer = setTimeout(() => {
      clearInterval(wordTimer);
      setVisible(false);
      sessionStorage.setItem("pp_splash_done", "1");
    }, 2000);

    return () => {
      clearInterval(wordTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-cream"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-accent"
          >
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-surface-white" fill="none">
              <path d="M5 17V11"  stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M12 17V6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M19 17V8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="12" cy="20.5" r="1.5" fill="currentColor" />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-5 text-center"
          >
            <div className="text-2xl font-bold tracking-tight text-ink">
              People&apos;s Priorities
            </div>
            <div className="mt-1 text-sm font-medium text-ink-muted">
              AI for Constituency Development
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 flex items-center gap-2 text-sm font-medium text-ink-muted"
          >
            <span>Turning</span>
            <div className="relative h-6 w-20 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={WORDS[wordIndex % WORDS.length]}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex items-center font-bold text-accent"
                >
                  {WORDS[wordIndex % WORDS.length]}
                </motion.span>
              </AnimatePresence>
            </div>
            <span>into Impact</span>
          </motion.div>

          <motion.div className="absolute bottom-12 h-0.5 w-[120px] rounded-full bg-border-subtle">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
