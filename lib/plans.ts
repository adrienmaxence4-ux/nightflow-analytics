/**
 * Central plan definitions: pricing, displayed features, and ENTITLEMENTS
 * (what each plan unlocks). Shared by the Billing UI, the checkout route and
 * the feature-gating helpers. Pure data — safe to import anywhere.
 *
 * Tiering:
 *  - free  → demo only (no store connection, no real data)
 *  - pro   → real data + all integrations + API/webhooks, but limited AI
 *  - scale → everything + unlimited AI + anomaly detection + real-time alerts
 */

export type PlanId = "free" | "pro" | "scale";
export type BillingInterval = "month" | "year";

export interface Plan {
  id: PlanId;
  name: string;
  tag: string;
  monthlyCents: number;
  yearlyCents: number; // ~10× monthly → 2 months free
  highlight: boolean;
  features: string[];
  // ── Entitlements ──
  integrations: boolean; // connect Shopify/Stripe/Klaviyo/GA…
  realData: boolean; // see real store data (vs demo only)
  apiAccess: boolean; // API keys & webhooks
  anomalies: boolean; // anomaly detection
  realtimeAlerts: boolean; // real-time alerts
  aiUnlimited: boolean; // unlimited AI (vs limited daily quota)
  aiPerDay: number; // daily AI quota when not unlimited (0 = none)
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    tag: "Gratuit",
    monthlyCents: 0,
    yearlyCents: 0,
    highlight: false,
    features: [
      "Page de démonstration (MoonStore)",
      "Aperçu de toutes les pages",
      "Données d'exemple uniquement",
    ],
    integrations: false,
    realData: false,
    apiAccess: false,
    anomalies: false,
    realtimeAlerts: false,
    aiUnlimited: false,
    aiPerDay: 0,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tag: "Populaire",
    monthlyCents: 4900,
    yearlyCents: 49000,
    highlight: true,
    features: [
      "Vos vraies données de boutique",
      "Toutes les intégrations (Shopify, Stripe, Klaviyo, GA4)",
      "API & webhooks",
      "Insights IA — quota quotidien",
    ],
    integrations: true,
    realData: true,
    apiAccess: true,
    anomalies: false,
    realtimeAlerts: false,
    aiUnlimited: false,
    aiPerDay: 20,
  },
  scale: {
    id: "scale",
    name: "Scale",
    tag: "Agences",
    monthlyCents: 14900,
    yearlyCents: 149000,
    highlight: false,
    features: [
      "Tout le plan Pro, plus :",
      "Insights IA illimités",
      "Détection d'anomalies",
      "Alertes temps réel",
      "Multi-comptes & marque blanche",
    ],
    integrations: true,
    realData: true,
    apiAccess: true,
    anomalies: true,
    realtimeAlerts: true,
    aiUnlimited: true,
    aiPerDay: 0,
  },
};

export const PLAN_LIST: Plan[] = [PLANS.free, PLANS.pro, PLANS.scale];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}

/** Plan ranking for upgrade/downgrade comparisons. */
export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, scale: 2 };

export function priceCents(plan: Plan, interval: BillingInterval): number {
  return interval === "year" ? plan.yearlyCents : plan.monthlyCents;
}

export function formatEuro(cents: number): string {
  const v = cents / 100;
  return `€${(Number.isInteger(v) ? v : v.toFixed(2)).toLocaleString("fr-FR")}`;
}
