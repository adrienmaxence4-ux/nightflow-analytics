// ─────────────────────────────────────────────────────────────
// Shared domain types for Nightflow Analytics
// ─────────────────────────────────────────────────────────────

export type Range = "day" | "week" | "month";

export type Trend = "up" | "down";

export type KpiKey = "revenue" | "orders" | "conversion" | "visitors";

export interface Kpi {
  key: KpiKey;
  label: string;
  value: string;
  delta: string;
  dir: Trend;
  sub: string;
  icon: string;
  tone: "cyan" | "pink" | "violet" | "lime";
}

export interface SeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  pct: number;
}

export interface BarDatum {
  name: string;
  value: number;
}

export interface RangeData {
  sub: string;
  kpis: Kpi[];
  series: SeriesPoint[];
  funnel: FunnelStep[];
  bars: BarDatum[];
}

export interface Product {
  id: string;
  icon: string;
  name: string;
  sales: number;
  revenue: string;
  conversion: string;
  trend: Trend;
  delta: string;
  note: string;
}

/**
 * The core of the product: an insight is not a metric, it's a narrative.
 * Every insight answers: What happened? → Why? → What to do?
 */
export interface Insight {
  id: string;
  severity: "critical" | "warning" | "positive" | "info";
  icon: string;
  what: string; // Que se passe-t-il ?
  why: string; // Pourquoi ?
  action: string; // Que dois-je faire ?
  impact: string; // Estimated business impact
  source: string;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  impact: string;
  impactLevel: "high" | "medium";
  cta: string;
  effort: "Faible" | "Moyen" | "Élevé";
}

export interface Notification {
  id: string;
  type: "stock" | "sales" | "ads" | "system" | "ai";
  severity: "critical" | "warning" | "info" | "positive";
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface Campaign {
  id: string;
  channel: string;
  logo: string;
  status: "active" | "paused" | "ended";
  spend: string;
  revenue: string;
  roas: number;
  trend: Trend;
  delta: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  store: string;
  plan: "Starter" | "Pro" | "Scale";
}
