"use client";

import { Check } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const PLANS = [
  {
    name: "Starter",
    price: "€0",
    period: "/mois",
    tag: "Gratuit",
    features: ["1 boutique", "Dashboard & analytics", "3 insights IA / jour", "Support email"],
    cta: "Plan actuel",
    highlight: false,
  },
  {
    name: "Pro",
    price: "€49",
    period: "/mois",
    tag: "Populaire",
    features: [
      "Boutiques illimitées",
      "Insights IA illimités",
      "Détection d'anomalies",
      "Alertes temps réel",
      "Toutes les intégrations",
    ],
    cta: "Passer en Pro",
    highlight: true,
  },
  {
    name: "Scale",
    price: "€149",
    period: "/mois",
    tag: "Agences",
    features: [
      "Tout Pro +",
      "Multi-comptes clients",
      "Rapports en marque blanche",
      "API & webhooks",
      "Account manager dédié",
    ],
    cta: "Contacter les ventes",
    highlight: false,
  },
];

export default function BillingPage() {
  const toast = useToast();
  const { user } = useAuth();

  return (
    <PageTransition>
      <PageHeader
        title="Facturation"
        subtitle={`Votre plan actuel : ${user?.plan ?? "Starter"}`}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            hover
            className={`flex flex-col p-6 ${
              plan.highlight
                ? "border-glass-hi shadow-glow [background:linear-gradient(160deg,rgba(154,107,255,0.18),rgba(61,242,255,0.06))]"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-extrabold">{plan.name}</h3>
              <Badge variant={plan.highlight ? "violet" : "cyan"}>{plan.tag}</Badge>
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-[34px] font-extrabold tracking-tight">
                {plan.price}
              </span>
              <span className="mb-1.5 text-sm text-ink-dim">{plan.period}</span>
            </div>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-ink-dim">
                  <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-neon-cyan/15 text-neon-cyan">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                if (plan.name === user?.plan) {
                  toast("Vous êtes déjà sur ce plan");
                } else if (plan.cta === "Contacter les ventes") {
                  window.location.href =
                    "mailto:sales@nightflow.app?subject=Plan%20Scale%20Nightflow";
                } else {
                  toast(`${plan.cta} — paiement bientôt disponible`, "info");
                }
              }}
              className={`mt-6 w-full rounded-xl py-2.5 text-sm font-bold transition ${
                plan.highlight
                  ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:brightness-110"
                  : "border border-glass-border bg-glass text-ink-dim hover:border-glass-hi hover:text-white"
              }`}
            >
              {plan.cta}
            </button>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-[15px] font-bold">Méthode de paiement</h3>
        <div className="flex items-center gap-4 rounded-xl border border-glass-border bg-glass-2 p-4">
          <span className="grid h-10 w-14 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold">
            VISA
          </span>
          <div className="flex-1">
            <div className="text-[13px] font-bold">•••• •••• •••• 4242</div>
            <div className="text-[11px] text-ink-mut">Expire 09/27</div>
          </div>
          <button
            onClick={() => toast("Mise à jour du moyen de paiement")}
            className="rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
          >
            Modifier
          </button>
        </div>
      </Card>
    </PageTransition>
  );
}
