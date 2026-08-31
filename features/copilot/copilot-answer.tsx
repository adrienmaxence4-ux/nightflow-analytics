"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RichText } from "@/components/ui/rich-text";
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
          <div className="mt-3 rounded-[12px] border border-line bg-panel2 p-5 text-[17px] leading-relaxed">
            <span className="mb-2 inline-flex items-center gap-1.5 text-[15px] font-extrabold tracking-[0.08em] text-accent-text">
              RÉPONSE DU COPILOTE
            </span>
            {busy ? (
              <p className="text-ink3">Analyse en cours…</p>
            ) : (
              <RichText>{answer ?? ""}</RichText>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
