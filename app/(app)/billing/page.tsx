"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  PLAN_LIST,
  PLAN_RANK,
  formatEuro,
  getPlan,
  priceCents,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";

export default function BillingPage() {
  const toast = useToast();
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const [current, setCurrent] = useState<PlanId>("free");
  const [hasCustomer, setHasCustomer] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadSub = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      if (res.ok) {
        const j = await res.json();
        setCurrent((j.plan ?? "free") as PlanId);
        setHasCustomer(!!j.hasStripeCustomer);
        if (j.interval) setBillingInterval(j.interval);
      }
    } catch {
      /* keep defaults */
    }
  }, []);

  // On return from Stripe Checkout, confirm + record the plan server-side.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("checkout");
    const sid = sp.get("session_id");
    if (r === "success" && sid) {
      fetch("/api/billing/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      })
        .then(() => toast("Paiement réussi — abonnement activé 🎉"))
        .catch(() => {})
        .finally(loadSub);
    } else if (r === "cancel") {
      toast("Paiement annulé", "info");
    } else {
      loadSub();
    }
    if (r) window.history.replaceState({}, "", "/billing");
  }, [toast, loadSub]);

  const subscribe = async (planId: string) => {
    if (busy) return;
    setBusy(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) window.location.href = data.url;
      else {
        toast(data.error ?? "Paiement indisponible", "info");
        setBusy(null);
      }
    } catch {
      toast("Paiement indisponible", "info");
      setBusy(null);
    }
  };

  const openPortal = async () => {
    if (busy) return;
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) window.location.href = data.url;
      else {
        toast(data.error ?? "Gestion indisponible", "info");
        setBusy(null);
      }
    } catch {
      toast("Gestion indisponible", "info");
      setBusy(null);
    }
  };

  const currentPlan = getPlan(current);

  return (
    <PageTransition>
      <PageHeader
        title="Facturation"
        subtitle={`Votre plan actuel : ${currentPlan.name}`}
      />

      {/* Monthly / annual toggle */}
      <div className="flex w-fit items-center gap-1 rounded-xl border border-glass-border bg-glass p-1">
        {(["month", "year"] as BillingInterval[]).map((i) => (
          <button
            key={i}
            onClick={() => setBillingInterval(i)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              interval === i
                ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow"
                : "text-ink-dim hover:text-white"
            }`}
          >
            {i === "month" ? "Mensuel" : "Annuel"}
            {i === "year" && (
              <span className="ml-1.5 rounded bg-neon-lime/20 px-1 py-0.5 text-[9px] font-extrabold text-neon-lime">
                2 MOIS OFFERTS
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const isCurrent = plan.id === current;
          const cents = priceCents(plan, interval);
          const perMonth =
            interval === "year" && plan.yearlyCents > 0
              ? `soit ${formatEuro(Math.round(plan.yearlyCents / 12))}/mois`
              : null;
          // CTA logic: new subscribers → checkout; existing → portal; free downgrade → portal.
          let label = `Passer en ${plan.name}`;
          let action: () => void = () => subscribe(plan.id);
          if (isCurrent) {
            label = "Plan actuel";
            action = () =>
              hasCustomer ? openPortal() : toast("Vous êtes sur ce plan");
          } else if (plan.id === "free") {
            label = hasCustomer ? "Rétrograder" : "Plan gratuit";
            action = () =>
              hasCustomer
                ? openPortal()
                : toast("Vous êtes déjà sur le plan gratuit");
          } else if (current !== "free" && PLAN_RANK[plan.id] !== PLAN_RANK[current]) {
            label = `Changer pour ${plan.name}`;
            action = openPortal;
          }

          return (
            <Card
              key={plan.id}
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
                  {formatEuro(cents)}
                </span>
                <span className="mb-1.5 text-sm text-ink-dim">
                  {plan.id === "free" ? "/mois" : interval === "year" ? "/an" : "/mois"}
                </span>
              </div>
              <div className="mt-0.5 h-4 text-[11px] text-neon-lime">{perMonth}</div>

              <ul className="mt-4 flex flex-1 flex-col gap-2.5">
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
                disabled={busy === plan.id || (busy === "portal" && isCurrent)}
                onClick={action}
                className={`mt-6 w-full rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-60 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:brightness-110"
                    : "border border-glass-border bg-glass text-ink-dim hover:border-glass-hi hover:text-white"
                }`}
              >
                {busy === plan.id ? "Redirection…" : label}
              </button>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold">Méthode de paiement & abonnement</h3>
          <button
            onClick={openPortal}
            disabled={busy === "portal"}
            className="rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white disabled:opacity-60"
          >
            {busy === "portal" ? "Ouverture…" : "Gérer (carte, plan, factures)"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-mut">
          {hasCustomer
            ? "Modifiez votre carte, changez ou résiliez votre abonnement et consultez vos factures via le portail sécurisé Stripe."
            : "Choisissez un plan payant ci-dessus pour activer la gestion de votre carte et de votre abonnement."}
        </p>
      </Card>
    </PageTransition>
  );
}
