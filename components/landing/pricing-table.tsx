"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  LANDING_PLANS,
  formatEuro,
  priceCents,
  type BillingInterval,
  type Plan,
} from "@/lib/plans";

/**
 * Tarifs de la landing, avec la bascule mensuel / annuel. Deux plans : le
 * gratuit sert à regarder, le Pro sert à brancher sa boutique. Scale reste sur
 * /billing (voir LANDING_PLANS).
 *
 * Le libellé du bouton Pro porte l'essai : un bouton « Choisir Pro » faisait
 * lire au visiteur qu'il allait payer alors qu'il ne payait pas.
 */

function ctaLabel(plan: Plan): string {
  if (plan.id === "free") return "Regarder la démo";
  return "Essayer Nightflow";
}

export function PricingTable() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const yearly = interval === "year";

  return (
    <>
      {/* Bascule. Deux boutons plutôt qu'un interrupteur : l'état actif est
          lisible sans avoir à interpréter la position d'un curseur. */}
      <div className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Période de facturation"
          className="inline-flex gap-1 rounded-[14px] border border-line bg-panel2 p-1"
        >
          {(
            [
              ["month", "Mensuel"],
              ["year", "Annuel"],
            ] as const
          ).map(([value, label]) => {
            const on = interval === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                aria-pressed={on}
                className={[
                  "min-h-tap rounded-[10px] px-5 text-[16px] font-bold transition duration-fast",
                  on
                    ? "bg-accent text-accent-ink"
                    : "text-ink2 hover:text-ink active:brightness-95",
                ].join(" ")}
              >
                {label}
                {value === "year" && (
                  <span className={on ? "font-semibold text-accent-ink" : "text-accent-text"}>
                    {" "}
                    −2 mois
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-[760px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {LANDING_PLANS.map((plan) => {
          const cents = priceCents(plan, interval);
          const free = plan.monthlyCents === 0;
          // Prix annuel ramené au mois : le visiteur compare des mois, pas des ans.
          const perMonth = yearly && !free ? Math.round(plan.yearlyCents / 12) : cents;

          return (
            <div
              key={plan.id}
              className={[
                "flex flex-col rounded-lg border bg-panel p-8",
                plan.highlight ? "border-accent" : "border-line",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-[24px] font-extrabold">{plan.name}</h3>
                <span
                  className={[
                    "rounded-pill px-3 py-1 text-[14px] font-bold",
                    plan.highlight
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-accent-text",
                  ].join(" ")}
                >
                  {plan.tag}
                </span>
              </div>

              <div className="mt-4 flex items-end gap-1.5">
                <span
                  className="font-display text-[44px] font-extrabold tracking-[-0.02em]"
                  data-numeric
                >
                  {formatEuro(perMonth)}
                </span>
                <span className="mb-2 text-[17px] text-ink3">/mois</span>
              </div>

              {/* Une seule ligne de contexte sous le prix — elle change de rôle
                  selon le plan, mais occupe toujours la même place. */}
              <p className="mt-1.5 min-h-[24px] text-[15px] text-ink3">
                {free
                  ? "Pour toujours, sans carte"
                  : yearly
                    ? `Facturé ${formatEuro(plan.yearlyCents)} par an, après l'essai`
                    : "Après l'essai. Sans engagement, résiliable en 2 clics"}
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-[17px] leading-snug text-ink2"
                  >
                    <Check
                      className="mt-1 h-[18px] w-[18px] flex-none text-accent"
                      strokeWidth={3}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={free ? "#demo" : "/signup"}
                className={`mt-7 w-full ${buttonVariants({ variant: plan.highlight ? "primary" : "outline", size: "lg" })}`}
              >
                {ctaLabel(plan)}
              </Link>

              {plan.id === "pro" && (
                <p className="mt-3 text-center text-[14px] text-ink3">
                  Aucune carte demandée pour l&apos;essai.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
