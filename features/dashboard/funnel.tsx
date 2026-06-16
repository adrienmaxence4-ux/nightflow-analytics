"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/utils/format";
import type { FunnelStep } from "@/types";

const GRADIENTS = [
  "from-neon-cyan to-neon-cyansoft",
  "from-neon-cyan to-neon-violet",
  "from-neon-violet to-neon-pink",
  "from-neon-pink to-neon-violet",
  "from-neon-pink to-neon-pinksoft",
];

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-[15px] font-bold">Tunnel de conversion</h3>
      <div className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-ink-dim">{s.label}</span>
              <b>
                {formatNumber(s.value)} · {s.pct}%
              </b>
            </div>
            <div className="h-2.5 overflow-hidden rounded-lg bg-[rgba(120,140,255,0.08)]">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: "easeOut" }}
                style={{ width: `${s.pct}%`, transformOrigin: "left" }}
                className={`h-full rounded-lg bg-gradient-to-r ${GRADIENTS[i]} shadow-glow`}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
