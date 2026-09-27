/**
 * Central plan definitions: pricing, displayed features, and ENTITLEMENTS
 * (what each plan unlocks). Shared by the Billing UI, the checkout route and
 * the feature-gating helpers. Pure data — safe to import anywhere.
 *
 * Tiering:
 *  - free  → demo only (no store connection, no real data)
 *  - pro   → real data + all integrations, limited AI quota
 *  - scale → pro + unlimited AI
 *
 * `apiAccess`, `anomalies` and `realtimeAlerts` are read nowhere: the
 * detection engine runs for every real store and there is no customer API.
 * They stay as data so a future gate has a flag to read, but no plan copy may
 * promise them until something checks them.
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
      "Boutique de démonstration MoonStore",
      "Toutes les pages, en aperçu",
      "Aucune donnée réelle",
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
    monthlyCents: 900,
    yearlyCents: 9000,
    highlight: true,
    features: [
      "30 jours gratuits, sans carte",
      "Ta boutique connectée : Shopify, WooCommerce, Wix, Stripe, Klaviyo, GA4",
      "Daily Brief et alertes chaque jour",
      "Rapports PDF, Excel et Word",
      "20 questions au Copilote par jour",
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
    monthlyCents: 1900,
    yearlyCents: 19000,
    highlight: false,
    features: [
      "Tout le plan Pro",
      "Questions au Copilote illimitées",
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

/**
 * What the landing sells. Scale stays on /billing for the accounts that have
 * it, but its only real difference with Pro today is the AI quota — not a
 * reason to exist on a page whose job is to make one choice obvious.
 */
export const LANDING_PLANS: Plan[] = [PLANS.free, PLANS.pro];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}

/** Plan ranking for upgrade/downgrade comparisons. */
export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, scale: 2 };

export function priceCents(plan: Plan, interval: BillingInterval): number {
  return interval === "year" ? plan.yearlyCents : plan.monthlyCents;
}

/**
 * Prix en euros, formaté en français : séparateur de milliers par espace
 * insécable, virgule décimale, et pas de « ,00 » sur un montant rond.
 *
 * L'ancienne version appelait `.toLocaleString("fr-FR")` sur le retour de
 * `toFixed(2)` — donc sur une chaîne, où la méthode renvoie la chaîne telle
 * quelle. Tout montant non entier sortait avec un point : « €7.50 ». Invisible
 * tant que les plans étaient à 0/9/19 €, mais déjà faux sur le prix mensualisé
 * de l'abonnement annuel.
 */
export function formatEuro(cents: number): string {
  const v = cents / 100;
  return `€${v.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
