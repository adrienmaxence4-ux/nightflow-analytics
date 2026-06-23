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
export type AiPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

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
  sales: number;
  revenue_cents: number;
  revenue_share: number;
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
  trend: TrendDir;
  delta: string | null;
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
  status: "connected" | "disconnected" | "error" | "pending" | "syncing" | "expired";
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationEventRow = {
  id: string;
  store_id: string;
  source: string;
  event_type: string;
  occurred_at: string;
  metrics: Record<string, number>;
  metadata: Record<string, string>;
  dedupe_key: string | null;
  created_at: string;
}

export type IntegrationJobRow = {
  id: string;
  store_id: string;
  provider: string;
  kind: "webhook" | "sync";
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  run_after: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionRow = {
  user_id: string;
  plan: "free" | "pro" | "scale";
  billing_interval: "month" | "year";
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  updated_at: string;
}

export type AiConversationRow = {
  id: string;
  user_id: string;
  store_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AiMessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type AiAnalysisRow = {
  id: string;
  store_id: string;
  kind: "insights" | "anomalies" | "recommendations" | "summary";
  payload: unknown;
  model: string | null;
  created_at: string;
};

export type AiRecommendationRow = {
  id: string;
  store_id: string;
  title: string;
  detail: string | null;
  impact: string | null;
  priority: AiPriority;
  impact_score: number;
  confidence_score: number;
  status: "open" | "applied" | "dismissed";
  created_at: string;
};

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
      integration_events: Table<IntegrationEventRow, "store_id" | "source" | "event_type" | "occurred_at">;
      integration_jobs: Table<IntegrationJobRow, "store_id" | "provider" | "kind">;
      subscriptions: Table<SubscriptionRow, "user_id">;
      ai_conversations: Table<AiConversationRow, "user_id">;
      ai_messages: Table<AiMessageRow, "conversation_id" | "role" | "content">;
      ai_analysis_history: Table<AiAnalysisRow, "store_id" | "kind">;
      ai_recommendations: Table<AiRecommendationRow, "store_id" | "title">;
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
      ai_priority: AiPriority;
    };
    CompositeTypes: Record<string, never>;
  };
}
