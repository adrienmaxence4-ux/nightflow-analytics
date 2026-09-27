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
 * One line of the Daily Brief — an alert ranked by severity, with the context
 * a merchant asks for before acting: since when, where, compared to what.
 * Shared by GET /api/brief, the dashboard and the landing sample.
 */
export interface BriefItem {
  id: string;
  severity: Severity;
  /** Headline with the number in it: "Conversion mobile : 2,8 % → 1,1 %". */
  title: string;
  /** One line of what changed, with the real figures. */
  detail: string;
  /** Concrete next step. */
  action: string;
  /** Estimated business impact, e.g. "≈ €420 de CA en jeu". */
  impact?: string;
  /** "depuis hier 14h", "depuis 9 jours". */
  since?: string;
  /** "surtout sur mobile", "Meta · Retargeting". */
  scope?: string;
}

export interface DailyBrief {
  /** ISO date the brief was computed for. */
  date: string;
  items: BriefItem[];
  /** At least one integration is connected. */
  connected: boolean;
  /** The store has metrics to reason about. */
  hasData: boolean;
  /** Display names of the connected sources, e.g. ["Shopify", "Klaviyo"]. */
  sources: string[];
  /** Most recent successful sync, ISO, or null. */
  lastSyncAt: string | null;
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
  /** Store name from signup / settings; null until the user provides one. */
  store: string | null;
  plan: "Starter" | "Pro" | "Scale";
}
