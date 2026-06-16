import type {
  Campaign,
  Insight,
  Notification,
  Product,
  RangeData,
  Recommendation,
} from "@/types";

// ─────────────────────────────────────────────────────────────
// MOCK DATA LAYER
// This is the single source of truth used by the services in
// `/services`. In Phase 2, swap these for real Shopify / GA4 /
// Stripe fetchers — the return shapes never change, so the UI
// keeps working untouched.
// ─────────────────────────────────────────────────────────────

export const RANGE_DATA: Record<string, RangeData> = {
  day: {
    sub: "Performance · Aujourd'hui · mis à jour il y a 12 s",
    kpis: [
      { key: "revenue", label: "Revenu aujourd'hui", value: "€48,920", delta: "+18.4%", dir: "up", sub: "vs hier", icon: "💰", tone: "cyan" },
      { key: "orders", label: "Commandes", value: "1,284", delta: "+9.1%", dir: "up", sub: "vs hier", icon: "🛍️", tone: "pink" },
      { key: "conversion", label: "Taux de conversion", value: "2.41%", delta: "-15%", dir: "down", sub: "vs hier", icon: "🎯", tone: "violet" },
      { key: "visitors", label: "Visiteurs actifs", value: "612", delta: "+126", dir: "up", sub: "en direct", icon: "👁️", tone: "lime" },
    ],
    series: Array.from({ length: 12 }, (_, i) => ({
      label: `${i * 2}h`,
      revenue: Math.round([22, 28, 25, 34, 30, 42, 38, 48, 44, 58, 52, 67][i] * 100),
      orders: [12, 16, 14, 20, 18, 24, 22, 28, 26, 33, 30, 40][i],
    })),
    funnel: [
      { label: "Visiteurs", value: 18420, pct: 100 },
      { label: "Pages produit", value: 9210, pct: 50 },
      { label: "Ajouts panier", value: 3120, pct: 17 },
      { label: "Checkout", value: 1640, pct: 9 },
      { label: "Achat", value: 1284, pct: 7 },
    ],
    bars: [
      { name: "Aurora Hoodie", value: 72 },
      { name: "Neon Cap", value: 48 },
      { name: "Tokyo Tee", value: 39 },
      { name: "Drift Mug", value: 27 },
      { name: "Star Socks", value: 18 },
    ],
  },
  week: {
    sub: "Performance · 7 derniers jours · mis à jour il y a 12 s",
    kpis: [
      { key: "revenue", label: "Revenu (7j)", value: "€312,540", delta: "+24.7%", dir: "up", sub: "vs sem. -1", icon: "💰", tone: "cyan" },
      { key: "orders", label: "Commandes", value: "8,910", delta: "+15.2%", dir: "up", sub: "vs sem. -1", icon: "🛍️", tone: "pink" },
      { key: "conversion", label: "Taux de conversion", value: "3.61%", delta: "+0.6%", dir: "up", sub: "vs sem. -1", icon: "🎯", tone: "violet" },
      { key: "visitors", label: "Visiteurs / jour", value: "4,180", delta: "+11%", dir: "up", sub: "moyenne", icon: "👁️", tone: "lime" },
    ],
    series: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((label, i) => ({
      label,
      revenue: [18000, 21000, 19500, 24000, 22800, 27000, 31000][i],
      orders: [120, 140, 130, 160, 150, 182, 210][i],
    })),
    funnel: [
      { label: "Visiteurs", value: 129000, pct: 100 },
      { label: "Pages produit", value: 67000, pct: 52 },
      { label: "Ajouts panier", value: 24500, pct: 19 },
      { label: "Checkout", value: 12100, pct: 9 },
      { label: "Achat", value: 8910, pct: 7 },
    ],
    bars: [
      { name: "Aurora Hoodie", value: 488 },
      { name: "Neon Cap", value: 312 },
      { name: "Tokyo Tee", value: 276 },
      { name: "Drift Mug", value: 190 },
      { name: "Star Socks", value: 132 },
    ],
  },
  month: {
    sub: "Performance · 30 derniers jours · mis à jour il y a 12 s",
    kpis: [
      { key: "revenue", label: "Revenu (30j)", value: "€1.28M", delta: "+31.9%", dir: "up", sub: "vs mois -1", icon: "💰", tone: "cyan" },
      { key: "orders", label: "Commandes", value: "36,420", delta: "+22.4%", dir: "up", sub: "vs mois -1", icon: "🛍️", tone: "pink" },
      { key: "conversion", label: "Taux de conversion", value: "3.78%", delta: "+0.9%", dir: "up", sub: "vs mois -1", icon: "🎯", tone: "violet" },
      { key: "visitors", label: "Visiteurs / jour", value: "5,640", delta: "+19%", dir: "up", sub: "moyenne", icon: "👁️", tone: "lime" },
    ],
    series: Array.from({ length: 12 }, (_, i) => ({
      label: `S${i + 1}`,
      revenue: [64000, 72000, 69000, 81000, 88000, 94000, 101000, 112000, 108000, 119000, 124000, 128000][i],
      orders: [420, 470, 450, 520, 560, 600, 650, 710, 690, 760, 800, 840][i],
    })),
    funnel: [
      { label: "Visiteurs", value: 548000, pct: 100 },
      { label: "Pages produit", value: 290000, pct: 53 },
      { label: "Ajouts panier", value: 98000, pct: 18 },
      { label: "Checkout", value: 49000, pct: 9 },
      { label: "Achat", value: 36420, pct: 7 },
    ],
    bars: [
      { name: "Aurora Hoodie", value: 1980 },
      { name: "Neon Cap", value: 1240 },
      { name: "Tokyo Tee", value: 1080 },
      { name: "Drift Mug", value: 760 },
      { name: "Star Socks", value: 540 },
    ],
  },
};

export const PRODUCTS: Product[] = [
  { id: "p1", icon: "🌌", name: "Aurora Hoodie", sales: 488, revenue: "€34,160", conversion: "4.8%", trend: "up", delta: "+24%", note: "Produit star : 72% de tes revenus. Crée un bundle pour réduire la dépendance et augmenter le panier moyen." },
  { id: "p2", icon: "🧢", name: "Neon Cap", sales: 312, revenue: "€12,480", conversion: "3.9%", trend: "up", delta: "+12%", note: "Croissance régulière. Bon candidat pour une campagne TikTok ciblée 18-24 ans." },
  { id: "p3", icon: "👕", name: "Tokyo Tee", sales: 276, revenue: "€9,660", conversion: "3.1%", trend: "up", delta: "+6%", note: "Marge élevée — idéal en up-sell sur la page Aurora Hoodie." },
  { id: "p4", icon: "☕", name: "Drift Mug", sales: 190, revenue: "€4,560", conversion: "2.4%", trend: "down", delta: "-8%", note: "En baisse. Photos produit faibles détectées — un nouveau visuel pourrait relancer la conversion." },
  { id: "p5", icon: "🧦", name: "Star Socks", sales: 132, revenue: "€2,640", conversion: "2.0%", trend: "down", delta: "-3%", note: "Faible conversion mobile. Teste un prix d'appel ou un pack de 3." },
];

/**
 * The narrative engine output. Each insight is structured as
 * What → Why → Action, the central promise of Nightflow.
 */
export const INSIGHTS: Insight[] = [
  {
    id: "i1",
    severity: "critical",
    icon: "📉",
    what: "Votre taux de conversion a baissé de 15% aujourd'hui.",
    why: "La cause principale est la chute du trafic mobile : le temps de chargement de la fiche produit mobile est passé de 1,2 s à 3,8 s.",
    action: "Optimisez les images de la page produit mobile et activez Apple Pay au checkout.",
    impact: "Récupération estimée : +€2,400 / semaine",
    source: "Détecté sur 3 200 sessions mobiles",
  },
  {
    id: "i2",
    severity: "warning",
    icon: "📦",
    what: "Aurora Hoodie représente 72% de votre chiffre d'affaires.",
    why: "Une dépendance à un seul produit fragilise votre boutique en cas de rupture ou de baisse de tendance.",
    action: "Lancez un bundle « Aurora + Neon Cap » pour diversifier le panier moyen.",
    impact: "Diversification + AOV : +€18 par commande",
    source: "Analyse de concentration produit",
  },
  {
    id: "i3",
    severity: "positive",
    icon: "🚀",
    what: "Vos ventes de nuit (21h-23h) génèrent 41% du CA quotidien.",
    why: "Votre audience est la plus active et la plus encline à acheter en soirée.",
    action: "Programmez vos drops produits et vos stories TikTok sur ce créneau.",
    impact: "Optimisation du timing : +12% de portée",
    source: "Tendance sur 7 jours",
  },
];

export const RECOMMENDATIONS: Recommendation[] = [
  { id: "r1", title: "Augmentez le budget TikTok de +15%", detail: "ROAS actuel 4.2 — canal sous-investi", impact: "+€2.1k", impactLevel: "high", cta: "Appliquer", effort: "Faible" },
  { id: "r2", title: "Optimisez le checkout mobile", detail: "Activez Apple Pay & paiement 1-clic", impact: "+0.8pt", impactLevel: "medium", cta: "Activer", effort: "Moyen" },
  { id: "r3", title: "Relancez les paniers abandonnés", detail: "128 paniers · email + -10%", impact: "+€940", impactLevel: "high", cta: "Lancer", effort: "Faible" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "stock", severity: "critical", icon: "🚨", title: "Rupture imminente — Aurora Hoodie", body: "Il reste 12 unités. Rupture estimée dans 2,4 jours au rythme actuel.", time: "il y a 5 min", read: false },
  { id: "n2", type: "sales", severity: "warning", icon: "📉", title: "Conversion Drift Mug -8%", body: "Le taux de rebond mobile est passé de 42% à 61%. Visuel produit probablement trop lent.", time: "il y a 1 h", read: false },
  { id: "n3", type: "ads", severity: "positive", icon: "🎯", title: "Campagne TikTok performante", body: "ROAS de 5.1 sur les dernières 24h — pensez à augmenter le budget.", time: "il y a 2 h", read: false },
  { id: "n4", type: "ai", severity: "info", icon: "✨", title: "Nouveau résumé hebdo disponible", body: "Le Copilot a généré votre bilan de la semaine.", time: "il y a 3 h", read: false },
  { id: "n5", type: "system", severity: "info", icon: "🔗", title: "Synchronisation Shopify terminée", body: "1 284 commandes importées avec succès.", time: "hier", read: true },
];

export const CAMPAIGNS: Campaign[] = [
  { id: "c1", channel: "TikTok Ads", logo: "🎵", status: "active", spend: "€4,200", revenue: "€17,640", roas: 4.2, trend: "up", delta: "+18%" },
  { id: "c2", channel: "Meta Ads", logo: "📘", status: "active", spend: "€3,800", revenue: "€13,300", roas: 3.5, trend: "up", delta: "+6%" },
  { id: "c3", channel: "Google Ads", logo: "🔍", status: "active", spend: "€2,100", revenue: "€8,820", roas: 4.2, trend: "down", delta: "-4%" },
  { id: "c4", channel: "Klaviyo Email", logo: "✉️", status: "active", spend: "€320", revenue: "€6,080", roas: 19.0, trend: "up", delta: "+22%" },
  { id: "c5", channel: "Influenceurs", logo: "⭐", status: "paused", spend: "€1,500", revenue: "€2,250", roas: 1.5, trend: "down", delta: "-30%" },
];

export const COPILOT_ANSWERS = [
  "Pour booster vos ventes ce soir : poussez l'Aurora Hoodie en story TikTok à 21h, votre heure de pic. C'est le créneau qui génère 41% de votre CA.",
  "Votre point faible numéro 1 est le checkout mobile. En activant Apple Pay, vous récupérez environ +0,8 pt de conversion, soit ~€2 400/semaine.",
  "128 paniers ont été abandonnés cette semaine. Une relance email avec -10% récupérerait environ €940. Je peux préparer la séquence.",
  "Le ROAS TikTok (4.2) est sous-investi par rapport à Meta (3.5). Réallouez +15% de budget vers TikTok : +€2,1k de CA projeté.",
  "Drift Mug décroche (-8%). La cause : un visuel produit qui charge en 3,8s sur mobile. Remplacez l'image principale en priorité.",
];
