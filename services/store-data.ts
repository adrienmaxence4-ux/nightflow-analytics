import { createClient } from "@/lib/supabase/server";
import type {
  BarDatum,
  Campaign,
  FunnelStep,
  Kpi,
  Product,
  Range,
  RangeData,
  SeriesPoint,
} from "@/types";
import type {
  CampaignRow,
  MetricDailyRow,
  ProductRow,
  StoreRow,
} from "@/types/database";

/**
 * SERVER-ONLY. Reads the user's real store data from Supabase and maps it to
 * the UI display models. Every function returns null when there's no store /
 * no data, so callers fall back to the MoonStore mock.
 */

const CHANNEL_LOGOS: Record<string, string> = {
  "TikTok Ads": "🎵",
  "Meta Ads": "📘",
  "Google Ads": "🔍",
  "Klaviyo Email": "✉️",
  Influenceurs: "⭐",
};

function euros(cents: number): string {
  return `€${Math.round(cents / 100).toLocaleString("fr-FR")}`;
}

async function getStore(): Promise<{
  supabase: NonNullable<ReturnType<typeof createClient>>;
  store: StoreRow;
} | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("stores").select("*").limit(1);
  const store = (data?.[0] as StoreRow | undefined) ?? null;
  return store ? { supabase, store } : null;
}

export async function getProductsForStore(): Promise<Product[] | null> {
  const ctx = await getStore();
  if (!ctx) return null;
  const { data } = await ctx.supabase
    .from("products")
    .select("*")
    .eq("store_id", ctx.store.id)
    .order("revenue_cents", { ascending: false });
  // Store exists → return real products (even an empty list), never mock.
  const rows = (data as ProductRow[] | null) ?? [];
  return rows.map(mapProduct);
}

function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    icon: r.icon ?? "📦",
    name: r.name,
    sales: r.sales,
    revenue: euros(r.revenue_cents),
    conversion: `${r.conversion}%`,
    trend: r.trend,
    delta: r.delta ?? "",
    note: r.note ?? "",
    stock: r.stock,
    revenueShare: Number(r.revenue_share),
  };
}

export async function getCampaignsForStore(): Promise<Campaign[] | null> {
  const ctx = await getStore();
  if (!ctx) return null;
  const { data } = await ctx.supabase
    .from("campaigns")
    .select("*")
    .eq("store_id", ctx.store.id)
    .order("revenue_cents", { ascending: false });
  // Store exists → return real campaigns (even empty), never mock.
  const rows = (data as CampaignRow[] | null) ?? [];
  return rows.map(
    (c): Campaign => ({
      id: c.id,
      channel: c.channel,
      logo: CHANNEL_LOGOS[c.channel] ?? "📣",
      status: c.status,
      spend: euros(c.spend_cents),
      revenue: euros(c.revenue_cents),
      roas: Number(c.roas),
      trend: c.trend,
      delta: c.delta ?? "",
    })
  );
}

/** Derives the dashboard RangeData (KPIs, series, funnel, bars) from real data. */
export async function getRangeDataForStore(
  range: Range
): Promise<RangeData | null> {
  const ctx = await getStore();
  if (!ctx) return null;

  const [{ data: metricsData }, { data: productsData }] = await Promise.all([
    ctx.supabase
      .from("metrics_daily")
      .select("*")
      .eq("store_id", ctx.store.id)
      .order("date", { ascending: false })
      .limit(60),
    ctx.supabase
      .from("products")
      .select("*")
      .eq("store_id", ctx.store.id)
      .order("sales", { ascending: false })
      .limit(5),
  ]);

  const metrics = (metricsData as MetricDailyRow[] | null) ?? [];
  const products = (productsData as ProductRow[] | null) ?? [];
  // Store exists → always return real data (even all-zero when there are no
  // sales yet). Never fall back to mock for a real, connected store.

  const win = range === "day" ? 1 : range === "week" ? 7 : 30;
  const cur = metrics.slice(0, win);
  const prev = metrics.slice(win, win * 2);

  const sum = (arr: MetricDailyRow[], k: keyof MetricDailyRow) =>
    arr.reduce((t, m) => t + (Number(m[k]) || 0), 0);

  const revCur = sum(cur, "revenue_cents");
  const revPrev = sum(prev, "revenue_cents");
  const ordCur = sum(cur, "orders");
  const ordPrev = sum(prev, "orders");
  const visCur = sum(cur, "visitors");
  const visPrev = sum(prev, "visitors");
  const convCur =
    cur.reduce((t, m) => t + Number(m.conversion), 0) / (cur.length || 1);
  const convPrev =
    prev.reduce((t, m) => t + Number(m.conversion), 0) / (prev.length || 1);

  const pct = (a: number, b: number) =>
    b > 0 ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(1)}%` : "—";
  const dir = (a: number, b: number): "up" | "down" => (a >= b ? "up" : "down");

  const top = [...products].sort((p, q) => q.revenue_cents - p.revenue_cents)[0];
  const aov = ordCur > 0 ? Math.round(revCur / ordCur / 100) : 0;
  const visPerDay = Math.round(visCur / (cur.length || 1));

  const subLabel =
    range === "day"
      ? "Aujourd'hui"
      : range === "week"
        ? "7 derniers jours"
        : "30 derniers jours";
  const vsLabel =
    range === "day" ? "vs hier" : range === "week" ? "vs sem. -1" : "vs mois -1";

  const kpis: Kpi[] = [
    {
      key: "revenue",
      label: range === "day" ? "Revenu aujourd'hui" : `Revenu (${win}j)`,
      value: euros(revCur),
      delta: pct(revCur, revPrev),
      dir: dir(revCur, revPrev),
      sub: vsLabel,
      icon: "💰",
      tone: "cyan",
      insight: top
        ? `Porté par ${top.name} (${Number(top.revenue_share)}% du CA).`
        : "Pas encore de ventes — synchronisez vos commandes.",
    },
    {
      key: "orders",
      label: "Commandes",
      value: ordCur.toLocaleString("fr-FR"),
      delta: pct(ordCur, ordPrev),
      dir: dir(ordCur, ordPrev),
      sub: vsLabel,
      icon: "🛍️",
      tone: "pink",
      insight: `Panier moyen €${aov}.`,
    },
    {
      key: "conversion",
      label: "Taux de conversion",
      value: `${convCur.toFixed(2)}%`,
      delta: pct(convCur, convPrev),
      dir: dir(convCur, convPrev),
      sub: vsLabel,
      icon: "🎯",
      tone: "violet",
      insight: "Conversion moyenne sur la période — surveillez le mobile.",
    },
    {
      key: "visitors",
      label: range === "day" ? "Visiteurs actifs" : "Visiteurs / jour",
      value: visPerDay.toLocaleString("fr-FR"),
      delta: pct(visCur, visPrev),
      dir: dir(visCur, visPrev),
      sub: range === "day" ? "en direct" : "moyenne",
      icon: "👁️",
      tone: "lime",
      insight: "Trafic moyen quotidien sur la période.",
    },
  ];

  // Series: chronological points (most recent N), labelled by date.
  const points = range === "day" ? 12 : range === "week" ? 7 : 12;
  const series: SeriesPoint[] = metrics
    .slice(0, points)
    .reverse()
    .map((m) => ({
      label: new Date(m.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: Math.round(m.revenue_cents / 100),
      orders: m.orders,
    }));

  // Bars: top products by units sold.
  const bars: BarDatum[] = products.map((p) => ({
    name: p.name,
    value: p.sales,
  }));

  // Funnel: only the endpoints are real (visitors + purchases from our data).
  // The middle steps (product views, add-to-cart, checkout) are web-behaviour
  // metrics that require Google Analytics — left at 0 until GA4 is connected,
  // rather than fabricating ratios.
  const visitors = visCur;
  const purchases = ordCur;
  const buyPct = visitors > 0 ? Math.round((purchases / visitors) * 100) : 0;
  const funnel: FunnelStep[] = [
    { label: "Visiteurs", value: visitors, pct: visitors > 0 ? 100 : 0 },
    { label: "Pages produit", value: 0, pct: 0 },
    { label: "Ajouts panier", value: 0, pct: 0 },
    { label: "Checkout", value: 0, pct: 0 },
    { label: "Achat", value: purchases, pct: buyPct },
  ];

  return {
    sub: `${ctx.store.name} · ${subLabel} · données réelles`,
    kpis,
    series,
    funnel,
    bars,
  };
}
