// ═══════════════════════════════════════════════════════════════
// Nightflow Analytics — Types de la base Supabase
//
// Reflète le schéma de /supabase/migrations. Peut être régénéré
// automatiquement depuis le projet lié avec :
//   npm run gen:types
// ═══════════════════════════════════════════════════════════════

export type TrendDir = "up" | "down";
export type CampaignStatus = "active" | "paused" | "ended";
export type SeverityLevel = "critical" | "warning" | "positive" | "info";
export type ImpactLevel = "high" | "medium" | "low";
export type NotificationType = "stock" | "sales" | "ads" | "system" | "ai";
export type PlanTier = "Starter" | "Pro" | "Scale";

// ── Row shapes (source of truth, no self-reference) ──

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanTier;
  locale: string;
  timezone: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type StoreRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  platform: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type ProductRow = {
  id: string;
  store_id: string;
  external_id: string | null;
  name: string;
  icon: string | null;
  price_cents: number;
  stock: number;
  conversion: number;
  trend: TrendDir;
  delta: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderRow = {
  id: string;
  store_id: string;
  external_id: string | null;
  customer_email: string | null;
  total_cents: number;
  currency: string;
  status: string;
  channel: string | null;
  placed_at: string;
  created_at: string;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price_cents: number;
}

export type CampaignRow = {
  id: string;
  store_id: string;
  channel: string;
  status: CampaignStatus;
  spend_cents: number;
  revenue_cents: number;
  roas: number;
  created_at: string;
  updated_at: string;
}

export type MetricDailyRow = {
  id: string;
  store_id: string;
  date: string;
  revenue_cents: number;
  orders: number;
  visitors: number;
  conversion: number;
  created_at: string;
}

export type InsightRow = {
  id: string;
  store_id: string;
  severity: SeverityLevel;
  icon: string | null;
  what: string;
  why: string;
  action: string;
  impact: string | null;
  source: string | null;
  status: "open" | "done" | "dismissed";
  created_at: string;
}

export type RecommendationRow = {
  id: string;
  store_id: string;
  title: string;
  detail: string | null;
  impact: string | null;
  impact_level: ImpactLevel;
  cta: string | null;
  effort: string | null;
  status: "open" | "applied" | "dismissed";
  created_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  store_id: string | null;
  type: NotificationType;
  severity: SeverityLevel;
  icon: string | null;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export type IntegrationRow = {
  id: string;
  store_id: string;
  provider: string;
  status: "connected" | "disconnected" | "error" | "pending";
  access_token: string | null;
  metadata: Record<string, unknown>;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Helper: build a Supabase-compatible table definition ──
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      stores: Table<StoreRow, "owner_id" | "name">;
      products: Table<ProductRow, "store_id" | "name">;
      orders: Table<OrderRow, "store_id">;
      order_items: Table<OrderItemRow, "order_id">;
      campaigns: Table<CampaignRow, "store_id" | "channel">;
      metrics_daily: Table<MetricDailyRow, "store_id" | "date">;
      insights: Table<InsightRow, "store_id" | "what" | "why" | "action">;
      recommendations: Table<RecommendationRow, "store_id" | "title">;
      notifications: Table<NotificationRow, "user_id" | "title">;
      integrations: Table<IntegrationRow, "store_id" | "provider">;
    };
    Views: Record<string, never>;
    Functions: {
      owns_store: {
        Args: { p_store: string };
        Returns: boolean;
      };
    };
    Enums: {
      trend_dir: TrendDir;
      campaign_status: CampaignStatus;
      severity_level: SeverityLevel;
      impact_level: ImpactLevel;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
