"use client";

import { useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CopilotAnswer, useCopilotAsk } from "@/features/copilot/copilot-answer";
import type { Product } from "@/types";

export function ProductDrawer({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const copilot = useCopilotAsk();
  const { reset } = copilot;
  useEffect(() => reset(), [product?.id, reset]);

  return (
    <Sheet open={!!product} onClose={onClose}>
      {product && (
        <>
          <div className="mb-5 flex items-center gap-4">
            <span className="grid h-[54px] w-[54px] place-items-center rounded-2xl border border-glass-border bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 text-[26px]">
              {product.icon}
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-mut">
                PRODUIT
              </div>
              <div className="text-[22px] font-extrabold">{product.name}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Revenu" value={product.revenue} />
            <Stat label="Unités vendues" value={String(product.sales)} />
            <Stat label="Conversion" value={product.conversion} />
            <Stat
              label="Tendance"
              value={`${product.trend === "up" ? "▲" : "▼"} ${product.delta}`}
              tone={product.trend === "up" ? "good" : "bad"}
            />
            <Stat
              label="Stock restant"
              value={`${product.stock} u.`}
              tone={product.stock <= 20 ? "bad" : undefined}
            />
            <Stat label="Part du CA" value={`${product.revenueShare}%`} />
          </div>

          <div className="mt-5 rounded-2xl border border-glass-hi p-4 text-[13px] leading-relaxed [background:linear-gradient(110deg,rgba(154,107,255,0.16),rgba(61,242,255,0.08))]">
            <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-neon-cyansoft">
              ✦ ANALYSE COPILOT
            </span>
            <p>{product.note}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button
              disabled={copilot.busy}
              onClick={() =>
                copilot.ask(
                  `Comment optimiser les ventes du produit « ${product.name} » (${product.sales} ventes, ${product.revenue}, conversion ${product.conversion}, stock ${product.stock}) ? Donne-moi 2-3 actions concrètes.`
                )
              }
            >
              {copilot.busy ? "Analyse…" : "Optimiser"}
            </Button>
            <Button
              variant="ghost"
              disabled={copilot.busy}
              onClick={() =>
                copilot.ask(
                  `Analyse en détail la performance du produit « ${product.name} » : que se passe-t-il, pourquoi, et que faire ?`
                )
              }
            >
              Analyser
            </Button>
          </div>

          <CopilotAnswer answer={copilot.answer} busy={copilot.busy} />
        </>
      )}
    </Sheet>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-glass-border bg-glass p-3.5">
      <div className="text-[11px] text-ink-mut">{label}</div>
      <div
        className={`mt-1 text-[19px] font-extrabold ${
          tone === "good"
            ? "text-neon-lime"
            : tone === "bad"
              ? "text-neon-pinksoft"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
