"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askCopilot } from "@/services/copilot.service";

/**
 * Small reusable Copilot helper for drawers/cards: a hook that asks the real
 * Copilot a question and exposes {answer, busy}, plus a styled answer box.
 */
export function useCopilotAsk() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const ask = useCallback(async (question: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setAnswer(null);
    const a = await askCopilot(question);
    setAnswer(a);
    setBusy(false);
    busyRef.current = false;
  }, []);

  const reset = useCallback(() => {
    setAnswer(null);
    setBusy(false);
    busyRef.current = false;
  }, []);

  return { ask, answer, busy, reset };
}

export function CopilotAnswer({
  answer,
  busy,
}: {
  answer: string | null;
  busy: boolean;
}) {
  return (
    <AnimatePresence>
      {(busy || answer) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-3 rounded-2xl border border-glass-hi p-4 text-[13px] leading-relaxed [background:linear-gradient(110deg,rgba(154,107,255,0.16),rgba(61,242,255,0.08))]">
            <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-neon-cyansoft">
              ✦ RÉPONSE DU COPILOT
            </span>
            {busy ? (
              <span className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-pulsedot rounded-full bg-neon-cyan"
                    style={{ animationDelay: `${d * 0.2}s` }}
                  />
                ))}
              </span>
            ) : (
              <p className="whitespace-pre-line">{answer}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
