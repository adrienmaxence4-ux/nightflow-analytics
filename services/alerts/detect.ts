import { createClient } from "@/lib/supabase/server";
import type {
  CampaignRow,
  MetricDailyRow,
  ProductRow,
  StoreRow,
} from "@/types/database";
import type {
  Insight,
  Notification,
  Priority,
  Recommendation,
  Severity,
  SuggestedAction,
} from "@/types";
import {
  discountAction,
  restockAction,
} from "@/services/actions/suggest";

/**
 * SERVER-ONLY. The detection engine — the heart of "Nightflow watches your
 * store for you". It scans the real time-series (metrics_daily), products and
 * campaigns and surfaces concrete, money-relevant alerts with REAL numbers.
 *
 * It is deterministic and AI-free, so it's fast enough for the sidebar badge
 * and reliable even when no AI key is configured. The same alerts feed:
 *   • /api/notifications  → bell badge, Notifications page, desktop notifier
 *   • /api/triage         → the daily triage panel on the dashboard
 *   • the Copilot insights fallback (rule-based, never the MoonStore demo)
 *
 * Structure: `snapshot()` crunches the numbers once, each RULE reads that
 * snapshot and returns the alerts it wants to raise, `detectAlerts()` runs them
 * all. Adding a detection = adding one rule function to RULES.
 */

export interface StoreSignals {
  storeName: string;
  /** Daily metrics, newest first. */
  metrics: MetricDailyRow[];
  products: ProductRow[];
  campaigns: CampaignRow[];
  connectedProviders: string[];
}

export interface DetectedAlert {
  id: string;
  type: Notification["type"];
  severity: Severity;
  icon: string;
  /** Short headline — Notification.title / Insight.what. */
  title: string;
  /** One-line detail with the real number — Notification.body. */
  body: string;
  /** Cause, for the insight view — Insight.why. */
  why: string;
  /** Concrete next step — Insight.action. */
  action: string;
  /** Estimated business impact, e.g. "≈ €420 de CA en jeu". */
  impact: string;
  /** 0-100, drives ordering (critical highest). */
  score: number;
  /** Set when the alert is about one product — the target of the auto-action. */
  productId?: string;
}

const euros = (cents: number) =>
  `€${Math.round(cents / 100).toLocaleString("fr-FR")}`;
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
/** Magnitude only, for "baisse de X% / hausse de X%" phrasings. */
const absPct = (n: number) => `${Math.abs(n).toFixed(0)}%`;
const count = (n: number) => n.toLocaleString("fr-FR");
const sum = (arr: MetricDailyRow[], k: keyof MetricDailyRow) =>
  arr.reduce((t, m) => t + (Number(m[k]) || 0), 0);
const avg = (arr: MetricDailyRow[], k: keyof MetricDailyRow) =>
  arr.length ? sum(arr, k) / arr.length : 0;
/** Percentage change from `before` to `now`; 0 when there is no base to compare. */
const changePct = (now: number, before: number) =>
  before > 0 ? ((now - before) / before) * 100 : 0;

/** Loads everything the detector needs for the current user's store. */
export async function loadStoreSignals(): Promise<StoreSignals | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: stores } = await supabase.from("stores").select("*").limit(1);
  const store = (stores?.[0] as StoreRow | undefined) ?? null;
  if (!store) return null;

  const [metricsRes, productsRes, campaignsRes, integrationsRes] =
    await Promise.all([
      supabase
        .from("metrics_daily")
        .select("*")
        .eq("store_id", store.id)
        .order("date", { ascending: false })
        .limit(60),
      supabase.from("products").select("*").eq("store_id", store.id),
      supabase.from("campaigns").select("*").eq("store_id", store.id),
      supabase
        .from("integrations")
        .select("provider")
        .eq("store_id", store.id)
        .eq("status", "connected"),
    ]);

  return {
    storeName: store.name,
    metrics: (metricsRes.data as MetricDailyRow[] | null) ?? [],
    products: (productsRes.data as ProductRow[] | null) ?? [],
    campaigns: (campaignsRes.data as CampaignRow[] | null) ?? [],
    connectedProviders:
      ((integrationsRes.data as { provider: string }[] | null) ?? []).map(
        (r) => r.provider
      ),
  };
}

/** One metric over the recent window vs the window before it. */
interface Trend {
  current: number;
  previous: number;
  /** Relative change in %, 0 when `previous` is 0. */
  change: number;
}

/** Everything the rules need, computed once from the raw signals. */
interface StoreSnapshot {
  /** Length in days of each comparison window. */
  windowDays: number;
  /** False when there isn't enough history to compare two windows. */
  hasPreviousWindow: boolean;
  revenue: Trend;
  orders: Trend;
  visitors: Trend;
  conversion: Trend;
  averageOrderValue: Trend;
  /** Totals over the whole tracked history, not just the recent window. */
  totalRevenue: number;
  totalOrders: number;
  totalVisitors: number;
  metrics: MetricDailyRow[];
  products: ProductRow[];
  campaigns: CampaignRow[];
}

function snapshot({ metrics, products, campaigns }: StoreSignals): StoreSnapshot {
  // Compare the most recent window against the one before it. Scale the window
  // to the data we actually have so trends work from day 2 onward.
  const windowDays = Math.max(1, Math.min(7, Math.floor(metrics.length / 2)));
  const recent = metrics.slice(0, windowDays);
  const earlier = metrics.slice(windowDays, windowDays * 2);

  const trend = (key: keyof MetricDailyRow, reduce = sum): Trend => {
    const current = reduce(recent, key);
    const previous = reduce(earlier, key);
    return { current, previous, change: changePct(current, previous) };
  };

  const revenue = trend("revenue_cents");
  const orders = trend("orders");
  const basket = (rev: number, ord: number) => (ord > 0 ? rev / ord : 0);
  const aovCurrent = basket(revenue.current, orders.current);
  const aovPrevious = basket(revenue.previous, orders.previous);

  return {
    windowDays,
    hasPreviousWindow: earlier.length > 0,
    revenue,
    orders,
    visitors: trend("visitors"),
    conversion: trend("conversion", avg),
    averageOrderValue: {
      current: aovCurrent,
      previous: aovPrevious,
      change: changePct(aovCurrent, aovPrevious),
    },
    totalRevenue: sum(metrics, "revenue_cents"),
    totalOrders: sum(metrics, "orders"),
    totalVisitors: sum(metrics, "visitors"),
    metrics,
    products,
    campaigns,
  };
}

/** A detection rule: reads the snapshot, returns the alerts it wants to raise. */
type Rule = (s: StoreSnapshot) => DetectedAlert[];

// ── Revenue ──────────────────────────────────────────────────────────────────
const revenueTrend: Rule = (s) => {
  const { revenue, visitors, windowDays } = s;
  if (!s.hasPreviousWindow || revenue.previous <= 0) return [];
  const change = revenue.change;
  const trafficIsDown = visitors.current < visitors.previous;

  if (change <= -20) {
    const critical = change <= -40;
    return [
      {
        id: "rev-drop",
        type: "sales",
        severity: critical ? "critical" : "warning",
        icon: "📉",
        title: `Chiffre d'affaires en baisse de ${absPct(change)}`,
        body: `${euros(revenue.current)} sur ${windowDays}j contre ${euros(revenue.previous)} la période précédente.`,
        why: trafficIsDown
          ? "Le trafic a baissé sur la même période — la chute du CA suit la chute des visiteurs."
          : "Le trafic tient mais le CA chute : la conversion ou le panier moyen se dégrade.",
        action: trafficIsDown
          ? "Relance l'acquisition (pub, email, réseaux) et vérifie qu'aucune campagne ne s'est arrêtée."
          : "Audite le tunnel d'achat (prix, frais de port, étapes du checkout) et relance tes meilleurs clients.",
        impact: `≈ ${euros(revenue.previous - revenue.current)} de CA perdus vs période précédente`,
        score: critical ? 98 : 82,
      },
    ];
  }
  if (change >= 25) {
    return [
      {
        id: "rev-surge",
        type: "sales",
        severity: "positive",
        icon: "🚀",
        title: `Chiffre d'affaires en hausse de ${absPct(change)}`,
        body: `${euros(revenue.current)} sur ${windowDays}j contre ${euros(revenue.previous)} avant.`,
        why: "La dynamique est excellente sur cette période.",
        action:
          "Identifie ce qui a marché (canal, produit, promo) et remets une couche pendant que ça monte.",
        impact: `+${euros(revenue.current - revenue.previous)} vs période précédente`,
        score: 46,
      },
    ];
  }
  return [];
};

/** A single day collapsing well below its own baseline — usually a breakage. */
const revenueCliff: Rule = ({ metrics }) => {
  if (metrics.length < 4) return [];
  const yesterday = metrics[0];
  const baseline = avg(metrics.slice(1, 8), "revenue_cents");
  if (baseline <= 0 || yesterday.revenue_cents >= baseline * 0.5) return [];
  return [
    {
      id: "rev-cliff",
      type: "sales",
      severity: "warning",
      icon: "⚠️",
      title: "Décrochage soudain du CA hier",
      body: `${euros(yesterday.revenue_cents)} hier contre ${euros(Math.round(baseline))} de moyenne les jours précédents.`,
      why: "Une chute brutale isolée signale souvent un problème technique (paiement, site, tracking) plus qu'une tendance.",
      action:
        "Passe une commande test de bout en bout maintenant et vérifie le statut de tes intégrations de paiement.",
      impact: `≈ ${euros(Math.round(baseline) - yesterday.revenue_cents)} en dessous du jour normal`,
      score: 88,
    },
  ];
};

// ── Conversion ───────────────────────────────────────────────────────────────
const conversionTrend: Rule = ({
  hasPreviousWindow,
  conversion,
  orders,
  windowDays,
}) => {
  const drops = conversion.previous > 0 && conversion.change <= -15;
  if (!hasPreviousWindow || !drops || orders.current <= 0) return [];
  return [
    {
      id: "conv-drop",
      type: "sales",
      severity: "warning",
      icon: "🎯",
      title: `Taux de conversion en baisse (${conversion.current.toFixed(2)}%)`,
      body: `${conversion.current.toFixed(2)}% sur ${windowDays}j contre ${conversion.previous.toFixed(2)}% avant (${pct(conversion.change)}).`,
      why: "Tu attires des visiteurs mais ils achètent moins : friction dans le tunnel, prix, ou trafic moins qualifié.",
      action:
        "Vérifie le parcours mobile, les frais de livraison affichés tard, et la vitesse de chargement des fiches produit.",
      impact: "Chaque +0,5 pt de conversion = plus de CA à trafic constant",
      score: 74,
    },
  ];
};

// ── Traffic ──────────────────────────────────────────────────────────────────
const trafficTrend: Rule = ({
  hasPreviousWindow,
  visitors,
  orders,
  windowDays,
}) => {
  if (!hasPreviousWindow || visitors.previous <= 0) return [];

  if (visitors.change <= -25) {
    return [
      {
        id: "traffic-drop",
        type: "ads",
        severity: "warning",
        icon: "🧭",
        title: `Trafic en baisse de ${absPct(visitors.change)}`,
        body: `${count(visitors.current)} visiteurs sur ${windowDays}j contre ${count(visitors.previous)} avant.`,
        why: "Moins de visiteurs = moins de ventes potentielles, quelle que soit ta conversion.",
        action:
          "Contrôle que tes campagnes tournent (budget non épuisé), et réactive email / SEO / réseaux.",
        impact: `−${count(visitors.previous - visitors.current)} visiteurs vs avant`,
        score: 70,
      },
    ];
  }
  // Traffic surging while orders stay flat: the visits are wasted.
  if (visitors.change >= 30 && orders.change < 10) {
    return [
      {
        id: "traffic-no-convert",
        type: "sales",
        severity: "warning",
        icon: "🕳️",
        title: "Pic de trafic qui ne convertit pas",
        body: `+${visitors.change.toFixed(0)}% de visiteurs mais les commandes stagnent.`,
        why: "Tu paies / génères du trafic qui repart sans acheter — soit il est mal ciblé, soit le tunnel bloque.",
        action:
          "Vérifie la cohérence pub→page (message, prix, promo annoncée) et propose une offre de bienvenue.",
        impact: "Trafic gaspillé = budget d'acquisition perdu",
        score: 72,
      },
    ];
  }
  return [];
};

// ── Average order value ──────────────────────────────────────────────────────
const basketTrend: Rule = ({ hasPreviousWindow, averageOrderValue, orders }) => {
  const aov = averageOrderValue;
  if (!hasPreviousWindow || aov.previous <= 0 || aov.change > -15) return [];
  return [
    {
      id: "aov-drop",
      type: "sales",
      severity: "warning",
      icon: "🧺",
      title: `Panier moyen en baisse (${euros(aov.current)})`,
      body: `${euros(aov.current)} contre ${euros(aov.previous)} avant (${pct(aov.change)}).`,
      why: "Les clients achètent moins par commande — souvent un effet promo ou la perte des ventes additionnelles.",
      action:
        "Ajoute des ventes croisées (« souvent acheté avec »), des paliers de livraison gratuite et des packs.",
      impact: `+1 € de panier moyen × ${orders.current} commandes = ${euros(orders.current * 100)} / période`,
      score: 64,
    },
  ];
};

// ── Stock ────────────────────────────────────────────────────────────────────
const LOW_STOCK_UNITS = 15;

const stockLevels: Rule = ({ products, totalOrders }) => {
  const out: DetectedAlert[] = [];
  for (const p of products) {
    // Only products that actually move are worth an alert; with no order in the
    // tracked window we have no evidence the stock matters.
    const sells = totalOrders > 0 && p.sales > 0;
    if (p.stock === 0 && p.sales > 0) {
      out.push({
        id: `stock-out-${p.id}`,
        productId: p.id,
        type: "stock",
        severity: "critical",
        icon: "🚨",
        title: `Rupture de stock : ${p.name}`,
        body: `0 unité en stock alors que le produit s'est vendu ${p.sales} fois.`,
        why: "Un best-seller en rupture, c'est du CA qui part directement chez tes concurrents.",
        action:
          "Réassortis en urgence ou mets le produit en précommande pour ne pas perdre la demande.",
        impact: `≈ ${euros(p.price_cents)} par vente manquée`,
        score: 95,
      });
    } else if (p.stock > 0 && p.stock <= LOW_STOCK_UNITS && sells) {
      out.push({
        id: `stock-low-${p.id}`,
        productId: p.id,
        type: "stock",
        severity: "warning",
        icon: "📦",
        title: `Stock faible : ${p.name}`,
        body: `Il reste ${p.stock} unité(s) pour un produit qui tourne.`,
        why: "Au rythme actuel des ventes, la rupture approche — et une rupture coûte des ventes + le référencement.",
        action: "Lance le réassort maintenant pour garder le produit disponible.",
        impact: `Protège ${euros(p.revenue_cents)} de CA déjà généré`,
        score: 60,
      });
    }
  }
  return out;
};

// ── Sales health ─────────────────────────────────────────────────────────────
const salesHealth: Rule = ({ products, totalOrders, totalVisitors }) => {
  if (products.length === 0 || totalOrders > 0) return [];
  // Visitors but no order at all points at a broken funnel, not at a cold start.
  const funnelLooksBroken = totalVisitors >= 100;
  return [
    {
      id: "no-sales",
      type: "sales",
      severity: "critical",
      icon: "🛒",
      title: funnelLooksBroken
        ? "Du trafic mais aucune vente"
        : "Aucune vente enregistrée",
      body: funnelLooksBroken
        ? `${count(totalVisitors)} visiteurs et 0 commande — le tunnel est probablement cassé.`
        : "Tu as des produits en ligne mais 0 commande pour l'instant.",
      why: funnelLooksBroken
        ? "Des visiteurs qui n'achètent jamais signalent un blocage : paiement en échec, frais surprises, ou bug du checkout."
        : "Sans trafic qualifié, même une boutique parfaite ne vend pas.",
      action: funnelLooksBroken
        ? "Passe une commande test complète (jusqu'au paiement) et corrige le premier point de friction."
        : "Lance une première campagne d'acquisition ciblée et configure une séquence email de bienvenue.",
      impact: funnelLooksBroken
        ? "100% des ventes potentielles bloquées"
        : "Activation à débloquer",
      score: funnelLooksBroken ? 96 : 80,
    },
  ];
};

// ── Revenue concentration risk ───────────────────────────────────────────────
const CONCENTRATION_SHARE = 50;

const concentrationRisk: Rule = ({ products, totalRevenue }) => {
  if (products.length < 2 || totalRevenue <= 0) return [];
  const top = [...products].sort((a, b) => b.revenue_cents - a.revenue_cents)[0];
  const share = Number(top.revenue_share);
  if (share < CONCENTRATION_SHARE) return [];
  return [
    {
      id: "concentration",
      type: "sales",
      severity: "warning",
      icon: "🧨",
      title: `Dépendance à un seul produit (${Math.round(share)}% du CA)`,
      body: `${top.name} pèse ${Math.round(share)}% de ton chiffre d'affaires.`,
      why: "Si ce produit décroche (rupture, saturation, concurrence), tout ton CA plonge avec lui.",
      action:
        "Pousse 2-3 produits complémentaires en cross-sell et teste-les en pub pour diversifier.",
      impact: "Réduit le risque sur la majorité de ton CA",
      score: 58,
    },
  ];
};

// ── Marketing / campaigns ────────────────────────────────────────────────────
const campaignReturns: Rule = ({ campaigns }) => {
  const out: DetectedAlert[] = [];
  for (const c of campaigns) {
    if (c.status !== "active" || c.spend_cents <= 0) continue;
    const roas = Number(c.roas);
    const spent = euros(c.spend_cents);
    const earned = euros(c.revenue_cents);

    if (roas < 1) {
      out.push({
        id: `roas-loss-${c.id}`,
        type: "ads",
        severity: "critical",
        icon: "💸",
        title: `${c.channel} : tu perds de l'argent (ROAS ${roas.toFixed(2)})`,
        body: `${spent} dépensés pour ${earned} générés.`,
        why: "Un ROAS sous 1 veut dire que chaque euro dépensé rapporte moins d'un euro : campagne déficitaire.",
        action:
          "Mets la campagne en pause ou refais le ciblage/créa avant de continuer à brûler du budget.",
        impact: `≈ ${euros(c.spend_cents - c.revenue_cents)} perdus sur ce canal`,
        score: 90,
      });
    } else if (roas >= 4) {
      out.push({
        id: `roas-win-${c.id}`,
        type: "ads",
        severity: "positive",
        icon: "🏆",
        title: `${c.channel} cartonne (ROAS ${roas.toFixed(2)})`,
        body: `${earned} générés pour ${spent} dépensés.`,
        why: "Ce canal est largement rentable — il y a de la marge pour investir davantage.",
        action: "Augmente le budget par paliers (+20%) en surveillant que le ROAS tient.",
        impact: "Lever de croissance le plus rentable actuellement",
        score: 50,
      });
    } else if (roas < 2) {
      out.push({
        id: `roas-thin-${c.id}`,
        type: "ads",
        severity: "warning",
        icon: "⚖️",
        title: `${c.channel} à peine rentable (ROAS ${roas.toFixed(2)})`,
        body: `${spent} dépensés pour ${earned} générés.`,
        why: "Une fois les coûts produit + livraison déduits, un ROAS sous ~2 est souvent à perte.",
        action:
          "Optimise le ciblage et la créa, ou réalloue le budget vers tes canaux qui performent.",
        impact: "Marge fragile à sécuriser",
        score: 56,
      });
    }
  }
  return out;
};

const RULES: Rule[] = [
  revenueTrend,
  revenueCliff,
  conversionTrend,
  trafficTrend,
  basketTrend,
  stockLevels,
  salesHealth,
  concentrationRisk,
  campaignReturns,
];

/** Positive reassurance — only when no rule raised anything actionable. */
function allClear({ totalOrders, totalRevenue }: StoreSnapshot): DetectedAlert {
  return {
    id: "all-clear",
    type: "system",
    severity: "positive",
    icon: "✅",
    title: "Tout est au vert",
    body: `${totalOrders} commande(s) et ${euros(totalRevenue)} de CA sur les données suivies, sans anomalie détectée.`,
    why: "Aucun signal négatif sur le CA, la conversion, le stock ou les campagnes.",
    action:
      "Continue sur ta lancée — pousse ce qui marche et garde un œil sur le réassort.",
    impact: "Situation saine",
    score: 30,
  };
}

/**
 * Pure detection — runs every rule against the signals and returns the alerts
 * that actually fire, sorted by severity/impact. No side effects, no AI.
 */
export function detectAlerts(signals: StoreSignals): DetectedAlert[] {
  const s = snapshot(signals);
  const alerts = RULES.flatMap((rule) => rule(s));

  const nothingToFix = !alerts.some((a) => isActionable(a.severity));
  if (nothingToFix && s.totalOrders > 0) alerts.push(allClear(s));

  return alerts.sort((a, b) => b.score - a.score);
}

/**
 * What every real-store caller wants: the detected alerts, or getting-started
 * guidance when a brand-new store has nothing to detect yet.
 */
export function detectAlertsOrOnboarding(s: StoreSignals): DetectedAlert[] {
  const alerts = detectAlerts(s);
  return alerts.length ? alerts : onboardingAlerts(s);
}

const ORDER = { critical: 0, warning: 1, positive: 2, info: 3 } as const;

/** True for the two severities that cost money now, and drive the bell badge. */
export function isActionable(severity: Severity): boolean {
  return severity === "critical" || severity === "warning";
}

/** Shared severity → priority ladder, so every surface agrees on it. */
export function priorityFromSeverity(severity: Severity): Priority {
  if (severity === "critical") return "CRITICAL";
  if (severity === "warning") return "HIGH";
  if (severity === "positive") return "MEDIUM";
  return "LOW";
}

/** Maps a detected alert to a sidebar/notification-page Notification. */
export function alertToNotification(a: DetectedAlert): Notification {
  return {
    id: a.id,
    type: a.type,
    severity: a.severity,
    icon: a.icon,
    title: a.title,
    body: a.body,
    time: "Maintenant",
    read: false,
  };
}

/** Maps a detected alert to a Copilot Insight (What / Why / Action). */
export function alertToInsight(a: DetectedAlert): Insight {
  return {
    id: a.id,
    severity: a.severity,
    icon: a.icon,
    what: a.title,
    why: a.why,
    action: a.action,
    impact: a.impact,
    source: "Détection automatique",
    priority: priorityFromSeverity(a.severity),
    impactScore: a.score,
    confidenceScore: 92,
  };
}

/**
 * Maps a detected alert to an executable action when Nightflow can carry the
 * fix out itself. Deterministic by construction: the target comes from the rule
 * that raised the alert, never from a model.
 */
function autoAction(
  a: DetectedAlert,
  products: ProductRow[]
): SuggestedAction | undefined {
  if (a.productId) {
    const product = products.find((p) => p.id === a.productId);
    if (!product) return undefined;
    // Out of stock or nearly out: the fix is the same, put units back.
    if (a.id.startsWith("stock-out-") || a.id.startsWith("stock-low-")) {
      return restockAction(product);
    }
    return undefined;
  }
  // Traffic that doesn't convert: a time-boxed promo is the standard,
  // fully reversible lever — and Nightflow can create it in one click.
  if (a.id === "traffic-no-convert" || a.id === "conv-drop") {
    return discountAction(null);
  }
  return undefined;
}

/** Maps a detected alert to an actionable Recommendation. */
export function alertToRecommendation(
  a: DetectedAlert,
  products: ProductRow[] = []
): Recommendation {
  const action = autoAction(a, products);
  return {
    id: `rec-${a.id}`,
    title: a.title,
    detail: a.action,
    impact: a.impact,
    impactLevel: isActionable(a.severity) ? "high" : "medium",
    cta: action ? action.label : "Voir comment faire",
    effort: "Moyen",
    // Recommendations never carry a "LOW" priority: an info-level alert still
    // deserves a medium nudge here.
    priority: a.severity === "info" ? "MEDIUM" : priorityFromSeverity(a.severity),
    impactScore: a.score,
    confidenceScore: 92,
    action,
  };
}

/**
 * When a real store has no detectable signals yet (brand-new, no metrics),
 * returns friendly getting-started guidance instead of an empty panel — so the
 * UI never has to fall back to the MoonStore demo for a real account.
 */
export function onboardingAlerts(s: StoreSignals): DetectedAlert[] {
  const hasProducts = s.products.length > 0;
  const hasMetrics = s.metrics.length > 0;
  const connected = s.connectedProviders.length > 0;
  const out: DetectedAlert[] = [];

  if (!connected) {
    out.push({
      id: "ob-connect",
      type: "system",
      severity: "info",
      icon: "🔌",
      title: "Connecte ta première source de données",
      body: "Relie Shopify, Stripe, Klaviyo ou Google Analytics pour analyser ta vraie activité.",
      why: "Nightflow a besoin de tes données réelles pour détecter ce qui marche et ce qui te fait perdre de l'argent.",
      action: "Va dans Paramètres → Intégrations et connecte ta boutique en un clic.",
      impact: "Débloque toutes les analyses",
      score: 40,
    });
  }
  if (connected && !hasProducts) {
    out.push({
      id: "ob-sync",
      type: "system",
      severity: "info",
      icon: "🔄",
      title: "Synchronise ton catalogue",
      body: "Source connectée mais aucun produit importé pour l'instant.",
      why: "Sans produits ni commandes, il n'y a encore rien à analyser.",
      action: "Lance une synchronisation depuis Paramètres → Intégrations.",
      impact: "Première analyse en quelques secondes",
      score: 38,
    });
  }
  if (hasProducts && !hasMetrics) {
    out.push({
      id: "ob-traffic",
      type: "system",
      severity: "info",
      icon: "📈",
      title: "En attente des premières données de trafic",
      body: "Ton catalogue est là — les analyses s'enrichiront dès les premières visites et ventes.",
      why: "Les tendances (CA, conversion, trafic) ont besoin d'au moins quelques jours d'historique.",
      action: "Connecte Google Analytics pour le trafic et lance ta première campagne.",
      impact: "Détection des anomalies dès J+2",
      score: 36,
    });
  }
  return out;
}

/** Stable ordering helper for callers that don't sort by score. */
export function bySeverity(a: DetectedAlert, b: DetectedAlert): number {
  return ORDER[a.severity] - ORDER[b.severity] || b.score - a.score;
}
