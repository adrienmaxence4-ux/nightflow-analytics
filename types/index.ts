// ─────────────────────────────────────────────────────────────
// Shared domain types for Nightflow Analytics
// ─────────────────────────────────────────────────────────────

export type Range = "day" | "week" | "month";

export type Trend = "up" | "down";

/** Priority bucket assigned by the AI prioritisation engine. */
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * How much a detected item matters. Shared by insights, alerts and
 * notifications so a single mapping drives colour, ordering and priority.
 * "critical" and "warning" are the actionable ones (see isActionable).
 */
export type Severity = "critical" | "warning" | "info" | "positive";

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
  /** One-line plain-language explanation: what's happening & why. */
  insight: string;
}

export interface SeriesPoint {
  label: string;
  revenue: number;
  orders: number;
  /** Optional per-point series so each KPI card can draw its own real curve. */
  visitors?: number;
  conversion?: number;
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
  /** Units left in stock. */
  stock: number;
  /** Share of total store revenue (%) — used to flag dependency. */
  revenueShare: number;
}

/**
 * A Copilot "analysis" — a themed deep-dive the user can open from the
 * AI Copilot page. Answers What / Why / What-to-do for a whole area.
 */
export interface AnalysisCard {
  id: string;
  category: "sales" | "products" | "marketing" | "forecast";
  icon: string;
  title: string;
  metric: string;
  trend: Trend;
  delta: string;
  accent: "cyan" | "pink" | "violet" | "lime";
  what: string;
  why: string;
  action: string;
  /** Deterministic mini-trend for the inline sparkline. */
  spark: number[];
}

/**
 * The core of the product: an insight is not a metric, it's a narrative.
 * Every insight answers: What happened? → Why? → What to do?
 */
export interface Insight {
  id: string;
  severity: Severity;
  icon: string;
  what: string; // Que se passe-t-il ?
  why: string; // Pourquoi ?
  action: string; // Que dois-je faire ?
  impact: string; // Estimated business impact
  source: string;
  /** AI prioritisation (optional — present on AI-generated insights). */
  priority?: Priority;
  /** 0-100 estimated business impact score. */
  impactScore?: number;
  /** 0-100 model confidence in this insight. */
  confidenceScore?: number;
}

/**
 * A numeric parameter the user may adjust in the confirmation panel before
 * Nightflow applies the action (quantity, new price, discount rate).
 */
export interface ActionField {
  field: "quantity" | "newPriceCents" | "percentage";
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Render the value as euros (stored in cents). */
  money?: boolean;
  suffix?: string;
}

/**
 * The executable half of a recommendation: what the "Appliquer" button will
 * actually do. Present only when Nightflow can carry the change out itself on
 * a connected store — otherwise the recommendation stays purely advisory.
 */
export interface SuggestedAction {
  kind:
    | "product.price.update"
    | "product.stock.set"
    | "product.unpublish"
    | "discount.create";
  /** Button label, e.g. "Réassortir maintenant". */
  label: string;
  /** One-line description of the change, shown on the card. */
  preview: string;
  /** Payload posted to /api/actions/plan. */
  params: Record<string, string | number>;
  editable?: ActionField;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  impact: string;
  impactLevel: "high" | "medium";
  cta: string;
  effort: "Faible" | "Moyen" | "Élevé";
  /** AI prioritisation (optional — present on AI-generated recommendations). */
  priority?: Priority;
  impactScore?: number;
  confidenceScore?: number;
  /** Set when Nightflow can apply this recommendation on the store itself. */
  action?: SuggestedAction;
}

export interface Notification {
  id: string;
  type: "stock" | "sales" | "ads" | "system" | "ai";
  severity: Severity;
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

/**
 * One line of the daily triage panel — an alert plus what to do about it.
 * Shared by GET /api/triage and the dashboard panel that renders it.
 */
export interface TriageItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  action: string;
  impact: string;
}

/** The triage split in three zones: what earns / what costs / what to watch. */
export interface TriageZones {
  winning: TriageItem[];
  fix: TriageItem[];
  watch: TriageItem[];
  connected: boolean;
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
