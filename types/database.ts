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

type Timestamps = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          plan: PlanTier;
          locale: string;
          timezone: string;
          currency: string;
        } & Timestamps;
        Insert: { id: string } & Partial<
          Omit<Database["public"]["Tables"]["profiles"]["Row"], "id">
        >;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string | null;
          platform: string;
          currency: string;
          timezone: string;
        } & Timestamps;
        Insert: { owner_id: string; name: string } & Partial<
          Database["public"]["Tables"]["stores"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["stores"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: {
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
        } & Timestamps;
        Insert: { store_id: string; name: string } & Partial<
          Database["public"]["Tables"]["products"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
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
        };
        Insert: { store_id: string } & Partial<
          Database["public"]["Tables"]["orders"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: { order_id: string } & Partial<
          Database["public"]["Tables"]["order_items"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          store_id: string;
          channel: string;
          status: CampaignStatus;
          spend_cents: number;
          revenue_cents: number;
          roas: number;
        } & Timestamps;
        Insert: { store_id: string; channel: string } & Partial<
          Database["public"]["Tables"]["campaigns"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Relationships: [];
      };
      metrics_daily: {
        Row: {
          id: string;
          store_id: string;
          date: string;
          revenue_cents: number;
          orders: number;
          visitors: number;
          conversion: number;
          created_at: string;
        };
        Insert: { store_id: string; date: string } & Partial<
          Database["public"]["Tables"]["metrics_daily"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["metrics_daily"]["Row"]>;
        Relationships: [];
      };
      insights: {
        Row: {
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
        };
        Insert: {
          store_id: string;
          what: string;
          why: string;
          action: string;
        } & Partial<Database["public"]["Tables"]["insights"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["insights"]["Row"]>;
        Relationships: [];
      };
      recommendations: {
        Row: {
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
        };
        Insert: { store_id: string; title: string } & Partial<
          Database["public"]["Tables"]["recommendations"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
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
        };
        Insert: { user_id: string; title: string } & Partial<
          Database["public"]["Tables"]["notifications"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          store_id: string;
          provider: string;
          status: "connected" | "disconnected" | "error" | "pending";
          access_token: string | null;
          metadata: Record<string, unknown>;
          connected_at: string | null;
        } & Timestamps;
        Insert: { store_id: string; provider: string } & Partial<
          Database["public"]["Tables"]["integrations"]["Row"]
        >;
        Update: Partial<Database["public"]["Tables"]["integrations"]["Row"]>;
        Relationships: [];
      };
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
