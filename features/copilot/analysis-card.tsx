"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisCard as AnalysisCardType } from "@/types";

const RULE: Record<AnalysisCardType["accent"], string> = {
  cyan: "border-l-cool",
  pink: "border-l-bad",
  violet: "border-l-warn",
  lime: "border-l-good",
};
const KIND: Record<AnalysisCardType["accent"], string> = {
  pink: "RISQUE",
  violet: "ALERTE",
  lime: "OPPORTUNITÉ",
  cyan: "ANALYSE",
};
const KIND_TEXT: Record<AnalysisCardType["accent"], string> = {
  pink: "text-bad",
  violet: "text-warn",
  lime: "text-good",
  cyan: "text-cool",
};

export function AnalysisCard({
  card,
  index,
  onOpen,
}: {
  card: AnalysisCardType;
  index: number;
  onOpen: (c: AnalysisCardType) => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onOpen(card)}
      className={cn("panel flex h-full flex-col border-l-4 p-6 text-left transition duration-base ease-out hover:bg-panel2", RULE[card.accent])}
    >
      <div className={cn("text-[15px] font-extrabold tracking-[0.08em]", KIND_TEXT[card.accent])}>
        {KIND[card.accent]}
      </div>
      <h3 className="mt-3 text-[20px] font-bold leading-snug text-ink">{card.what}</h3>
      <p className="mt-3 flex-1 text-[17px] leading-relaxed text-ink2">
        <b className="text-ink">Pourquoi :</b> {card.why}
      </p>
      <p className="mt-2 text-[17px] leading-relaxed text-ink2">
        <b className="text-ink">À faire :</b> {card.action}
      </p>
      <div className="mt-4 inline-flex items-center gap-2 text-[16px] font-semibold text-accent-text">
        Voir l&apos;analyse
        <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
      </div>
    </motion.button>
  );
}
