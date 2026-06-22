import { createClient } from "@/lib/supabase/server";
import type {
  CampaignRow,
  MetricDailyRow,
  ProductRow,
  StoreRow,
} from "@/types/database";
import type { Insight, Notification, Recommendation } from "@/types";

/**
 * SERVER-ONLY. The detection engine — the heart of "Nightflow watches your
 * store for you". It scans the real time-series (metrics_daily), products and
 * campaigns and surfaces concrete, money-relevant alerts with REAL numbers.
 *
 * It is deterministic and AI-free, so it's fast enough for the sidebar badge
 * and reliable even when no AI key is configured. The same alerts feed:
 *   • /api/notifications  → bell badge, Notifications page, desktop notifier
 *   • the Copilot insights fallback (rule-based, never the MoonStore demo)
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
  severity: Notification["severity"];
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
}

const euros = (cents: number) =>
  `€${Math.round(cents / 100).toLocaleString("fr-FR")}`;
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
/** Magnitude only, for "baisse de X% / hausse de X%" phrasings. */
const absPct = (n: number) => `${Math.abs(n).toFixed(0)}%`;
const sum = (arr: MetricDailyRow[], k: keyof MetricDailyRow) =>
  arr.reduce((t, m) => t + (Number(m[k]) || 0), 0);
const avg = (arr: MetricDailyRow[], k: keyof MetricDailyRow) =>
  arr.length ? sum(arr, k) / arr.length : 0;

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

/**
 * Pure detection — runs every rule against the signals and returns the alerts
 * that actually fire, sorted by severity/impact. No side effects, no AI.
 */
export function detectAlerts(s: StoreSignals): DetectedAlert[] {
  const out: DetectedAlert[] = [];
  const { metrics, products, campaigns } = s;

  // Compare the most recent window against the one before it. Scale the window
  // to the data we actually have so trends work from day 2 onward.
  const win = Math.max(1, Math.min(7, Math.floor(metrics.length / 2)));
  const cur = metrics.slice(0, win);
  const prev = metrics.slice(win, win * 2);
  const haveTrend = prev.length > 0;

  const revCur = sum(cur, "revenue_cents");
  const revPrev = sum(prev, "revenue_cents");
  const ordCur = sum(cur, "orders");
  const ordPrev = sum(prev, "orders");
  const visCur = sum(cur, "visitors");
  const visPrev = sum(prev, "visitors");
  const convCur = avg(cur, "conversion");
  const convPrev = avg(prev, "conversion");
  const aovCur = ordCur > 0 ? revCur / ordCur : 0;
  const aovPrev = ordPrev > 0 ? revPrev / ordPrev : 0;

  const totalOrders = sum(metrics, "orders");
  const totalRev = sum(metrics, "revenue_cents");
  const totalVisitors = sum(metrics, "visitors");
  const rel = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);

  // ── Revenue ──────────────────────────────────────────────────────────────
  if (haveTrend && revPrev > 0) {
    const change = rel(revCur, revPrev);
    if (change <= -20) {
      const critical = change <= -40;
      out.push({
        id: "rev-drop",
        type: "sales",
        severity: critical ? "critical" : "warning",
        icon: "📉",
        title: `Chiffre d'affaires en baisse de ${absPct(change)}`,
        body: `${euros(revCur)} sur ${win}j contre ${euros(revPrev)} la période précédente.`,
        why: visCur < visPrev
          ? "Le trafic a baissé sur la même période — la chute du CA suit la chute des visiteurs."
          : "Le trafic tient mais le CA chute : la conversion ou le panier moyen se dégrade.",
        action: visCur < visPrev
          ? "Relance l'acquisition (pub, email, réseaux) et vérifie qu'aucune campagne ne s'est arrêtée."
          : "Audite le tunnel d'achat (prix, frais de port, étapes du checkout) et relance tes meilleurs clients.",
        impact: `≈ ${euros(revPrev - revCur)} de CA perdus vs période précédente`,
        score: critical ? 98 : 82,
      });
    } else if (change >= 25) {
      out.push({
        id: "rev-surge",
        type: "sales",
        severity: "positive",
        icon: "🚀",
        title: `Chiffre d'affaires en hausse de ${absPct(change)}`,
        body: `${euros(revCur)} sur ${win}j contre ${euros(revPrev)} avant.`,
        why: "La dynamique est excellente sur cette période.",
        action: "Identifie ce qui a marché (canal, produit, promo) et remets une couche pendant que ça monte.",
        impact: `+${euros(revCur - revPrev)} vs période précédente`,
        score: 46,
      });
    }
  }

  // ── Sharp daily cliff (anomaly) ────────────────────────────────────────────
  if (metrics.length >= 4) {
    const last = metrics[0];
    const trailing = metrics.slice(1, 8);
    const baseline = avg(trailing, "revenue_cents");
    if (baseline > 0 && last.revenue_cents < baseline * 0.5) {
      out.push({
        id: "rev-cliff",
        type: "sales",
        severity: "warning",
        icon: "⚠️",
        title: "Décrochage soudain du CA hier",
        body: `${euros(last.revenue_cents)} hier contre ${euros(Math.round(baseline))} de moyenne les jours précédents.`,
        why: "Une chute brutale isolée signale souvent un problème technique (paiement, site, tracking) plus qu'une tendance.",
        action: "Passe une commande test de bout en bout maintenant et vérifie le statut de tes intégrations de paiement.",
        impact: `≈ ${euros(Math.round(baseline) - last.revenue_cents)} en dessous du jour normal`,
        score: 88,
      });
    }
  }

  // ── Conversion ─────────────────────────────────────────────────────────────
  if (haveTrend && convPrev > 0 && rel(convCur, convPrev) <= -15 && ordCur > 0) {
    out.push({
      id: "conv-drop",
      type: "sales",
      severity: "warning",
      icon: "🎯",
      title: `Taux de conversion en baisse (${convCur.toFixed(2)}%)`,
      body: `${convCur.toFixed(2)}% sur ${win}j contre ${convPrev.toFixed(2)}% avant (${pct(rel(convCur, convPrev))}).`,
      why: "Tu attires des visiteurs mais ils achètent moins : friction dans le tunnel, prix, ou trafic moins qualifié.",
      action: "Vérifie le parcours mobile, les frais de livraison affichés tard, et la vitesse de chargement des fiches produit.",
      impact: "Chaque +0,5 pt de conversion = plus de CA à trafic constant",
      score: 74,
    });
  }

  // ── Traffic ─────────────────────────────────────────────────────────────────
  if (haveTrend && visPrev > 0) {
    const change = rel(visCur, visPrev);
    if (change <= -25) {
      out.push({
        id: "traffic-drop",
        type: "ads",
        severity: "warning",
        icon: "🧭",
        title: `Trafic en baisse de ${absPct(change)}`,
        body: `${visCur.toLocaleString("fr-FR")} visiteurs sur ${win}j contre ${visPrev.toLocaleString("fr-FR")} avant.`,
        why: "Moins de visiteurs = moins de ventes potentielles, quelle que soit ta conversion.",
        action: "Contrôle que tes campagnes tournent (budget non épuisé), et réactive email / SEO / réseaux.",
        impact: `−${(visPrev - visCur).toLocaleString("fr-FR")} visiteurs vs avant`,
        score: 70,
      });
    } else if (change >= 30 && rel(ordCur, ordPrev) < 10) {
      out.push({
        id: "traffic-no-convert",
        type: "sales",
        severity: "warning",
        icon: "🕳️",
        title: "Pic de trafic qui ne convertit pas",
        body: `+${change.toFixed(0)}% de visiteurs mais les commandes stagnent.`,
        why: "Tu paies / génères du trafic qui repart sans acheter — soit il est mal ciblé, soit le tunnel bloque.",
        action: "Vérifie la cohérence pub→page (message, prix, promo annoncée) et propose une offre de bienvenue.",
        impact: "Trafic gaspillé = budget d'acquisition perdu",
        score: 72,
      });
    }
  }

  // ── Average order value ──────────────────────────────────────────────────────
  if (haveTrend && aovPrev > 0 && rel(aovCur, aovPrev) <= -15) {
    out.push({
      id: "aov-drop",
      type: "sales",
      severity: "warning",
      icon: "🧺",
      title: `Panier moyen en baisse (${euros(aovCur)})`,
      body: `${euros(aovCur)} contre ${euros(aovPrev)} avant (${pct(rel(aovCur, aovPrev))}).`,
      why: "Les clients achètent moins par commande — souvent un effet promo ou la perte des ventes additionnelles.",
      action: "Ajoute des ventes croisées (« souvent acheté avec »), des paliers de livraison gratuite et des packs.",
      impact: `+1 € de panier moyen × ${ordCur} commandes = ${euros(ordCur * 100)} / période`,
      score: 64,
    });
  }

  // ── Stock ────────────────────────────────────────────────────────────────────
  for (const p of products) {
    const velocity = totalOrders > 0 ? p.sales : 0; // units sold over the data window
    if (p.stock === 0 && p.sales > 0) {
      out.push({
        id: `stock-out-${p.id}`,
        type: "stock",
        severity: "critical",
        icon: "🚨",
        title: `Rupture de stock : ${p.name}`,
        body: `0 unité en stock alors que le produit s'est vendu ${p.sales} fois.`,
        why: "Un best-seller en rupture, c'est du CA qui part directement chez tes concurrents.",
        action: "Réassortis en urgence ou mets le produit en précommande pour ne pas perdre la demande.",
        impact: `≈ ${euros(p.price_cents)} par vente manquée`,
        score: 95,
      });
    } else if (p.stock > 0 && p.stock <= 15 && velocity > 0) {
      out.push({
        id: `stock-low-${p.id}`,
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

  // ── Sales health ──────────────────────────────────────────────────────────────
  if (products.length > 0 && totalOrders === 0) {
    const broken = totalVisitors >= 100;
    out.push({
      id: "no-sales",
      type: "sales",
      severity: "critical",
      icon: "🛒",
      title: broken ? "Du trafic mais aucune vente" : "Aucune vente enregistrée",
      body: broken
        ? `${totalVisitors.toLocaleString("fr-FR")} visiteurs et 0 commande — le tunnel est probablement cassé.`
        : "Tu as des produits en ligne mais 0 commande pour l'instant.",
      why: broken
        ? "Des visiteurs qui n'achètent jamais signalent un blocage : paiement en échec, frais surprises, ou bug du checkout."
        : "Sans trafic qualifié, même une boutique parfaite ne vend pas.",
      action: broken
        ? "Passe une commande test complète (jusqu'au paiement) et corrige le premier point de friction."
        : "Lance une première campagne d'acquisition ciblée et configure une séquence email de bienvenue.",
      impact: broken ? "100% des ventes potentielles bloquées" : "Activation à débloquer",
      score: broken ? 96 : 80,
    });
  }

  // ── Revenue concentration risk ───────────────────────────────────────────────
  if (products.length >= 2 && totalRev > 0) {
    const top = [...products].sort((a, b) => b.revenue_cents - a.revenue_cents)[0];
    const share = Number(top.revenue_share);
    if (share >= 50) {
      out.push({
        id: "concentration",
        type: "sales",
        severity: "warning",
        icon: "🧨",
        title: `Dépendance à un seul produit (${Math.round(share)}% du CA)`,
        body: `${top.name} pèse ${Math.round(share)}% de ton chiffre d'affaires.`,
        why: "Si ce produit décroche (rupture, saturation, concurrence), tout ton CA plonge avec lui.",
        action: "Pousse 2-3 produits complémentaires en cross-sell et teste-les en pub pour diversifier.",
        impact: "Réduit le risque sur la majorité de ton CA",
        score: 58,
      });
    }
  }

  // ── Marketing / campaigns ──────────────────────────────────────────────────────
  for (const c of campaigns) {
    if (c.status !== "active" || c.spend_cents <= 0) continue;
    const roas = Number(c.roas);
    if (roas < 1) {
      out.push({
        id: `roas-loss-${c.id}`,
        type: "ads",
        severity: "critical",
        icon: "💸",
        title: `${c.channel} : tu perds de l'argent (ROAS ${roas.toFixed(2)})`,
        body: `${euros(c.spend_cents)} dépensés pour ${euros(c.revenue_cents)} générés.`,
        why: "Un ROAS sous 1 veut dire que chaque euro dépensé rapporte moins d'un euro : campagne déficitaire.",
        action: "Mets la campagne en pause ou refais le ciblage/créa avant de continuer à brûler du budget.",
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
        body: `${euros(c.revenue_cents)} générés pour ${euros(c.spend_cents)} dépensés.`,
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
        body: `${euros(c.spend_cents)} dépensés pour ${euros(c.revenue_cents)} générés.`,
        why: "Une fois les coûts produit + livraison déduits, un ROAS sous ~2 est souvent à perte.",
        action: "Optimise le ciblage et la créa, ou réalloue le budget vers tes canaux qui performent.",
        impact: "Marge fragile à sécuriser",
        score: 56,
      });
    }
  }

  // ── All clear (positive reassurance) ───────────────────────────────────────────
  const hasNegative = out.some(
    (a) => a.severity === "critical" || a.severity === "warning"
  );
  if (!hasNegative && totalOrders > 0) {
    out.push({
      id: "all-clear",
      type: "system",
      severity: "positive",
      icon: "✅",
      title: "Tout est au vert",
      body: `${totalOrders} commande(s) et ${euros(totalRev)} de CA sur les données suivies, sans anomalie détectée.`,
      why: "Aucun signal négatif sur le CA, la conversion, le stock ou les campagnes.",
      action: "Continue sur ta lancée — pousse ce qui marche et garde un œil sur le réassort.",
      impact: "Situation saine",
      score: 30,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

const ORDER = { critical: 0, warning: 1, positive: 2, info: 3 } as const;

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
  const priority =
    a.severity === "critical"
      ? "CRITICAL"
      : a.severity === "warning"
        ? "HIGH"
        : a.severity === "positive"
          ? "MEDIUM"
          : "LOW";
  return {
    id: a.id,
    severity: a.severity,
    icon: a.icon,
    what: a.title,
    why: a.why,
    action: a.action,
    impact: a.impact,
    source: "Détection automatique",
    priority,
    impactScore: a.score,
    confidenceScore: 92,
  };
}

/** Maps a detected alert to an actionable Recommendation. */
export function alertToRecommendation(a: DetectedAlert): Recommendation {
  const priority =
    a.severity === "critical"
      ? "CRITICAL"
      : a.severity === "warning"
        ? "HIGH"
        : "MEDIUM";
  return {
    id: `rec-${a.id}`,
    title: a.title,
    detail: a.action,
    impact: a.impact,
    impactLevel: a.severity === "critical" || a.severity === "warning" ? "high" : "medium",
    cta: "Voir comment faire",
    effort: "Moyen",
    priority,
    impactScore: a.score,
    confidenceScore: 92,
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
