import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGNS, NOTIFICATIONS, PRODUCTS, STORE } from "@/services/mock/data";
import { parseMetric } from "@/utils/format";

/**
 * POST /api/demo/seed
 * Populates the logged-in user's REAL Supabase DB with the MoonStore demo
 * (store + products + campaigns + 60 days of metrics + notifications) so the
 * whole app runs on real data. Idempotent: skips if products already exist.
 */
export async function POST() {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 400 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const db = supabase as unknown as SupabaseClient;

  // 1. Get or create the store
  const { data: existing } = await supabase
    .from("stores")
    .select("id")
    .limit(1);
  let storeId = (existing?.[0] as { id: string } | undefined)?.id ?? null;

  if (!storeId) {
    const { data: created } = await db
      .from("stores")
      .insert({
        owner_id: user.id,
        name: STORE.name,
        slug: "moonstore",
        platform: "shopify",
        currency: "EUR",
      })
      .select("id")
      .single();
    storeId = (created as { id: string } | null)?.id ?? null;
  }
  if (!storeId) {
    return NextResponse.json({ error: "Création boutique échouée" }, { status: 500 });
  }

  // 2. Idempotency: skip if products already seeded
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: true, alreadySeeded: true, storeId });
  }

  // 3. Products (with snapshot fields)
  await db.from("products").insert(
    PRODUCTS.map((p) => {
      const revenueCents = parseMetric(p.revenue) * 100;
      return {
        store_id: storeId,
        external_id: p.id,
        name: p.name,
        icon: p.icon,
        price_cents: p.sales > 0 ? Math.round(revenueCents / p.sales) : 0,
        stock: p.stock,
        conversion: parseFloat(p.conversion) || 0,
        trend: p.trend,
        delta: p.delta,
        note: p.note,
        sales: p.sales,
        revenue_cents: revenueCents,
        revenue_share: p.revenueShare,
      };
    })
  );

  // 4. Campaigns
  await db.from("campaigns").insert(
    CAMPAIGNS.map((c) => ({
      store_id: storeId,
      channel: c.channel,
      status: c.status,
      spend_cents: parseMetric(c.spend) * 100,
      revenue_cents: parseMetric(c.revenue) * 100,
      trend: c.trend,
      delta: c.delta,
    }))
  );

  // 5. Metrics — 60 days of daily data (real time-series)
  const today = new Date();
  const metrics = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Gentle upward trend toward today + weekly seasonality.
    const growth = 1 - i * 0.004;
    const season = 1 + Math.sin((i / 7) * Math.PI * 2) * 0.08;
    const revenue = Math.round(780000 * growth * season); // cents
    return {
      store_id: storeId,
      date: d.toISOString().slice(0, 10),
      revenue_cents: revenue,
      orders: Math.round(revenue / 5500),
      visitors: Math.round(6500 * growth * season),
      conversion: Number((2.1 + Math.sin(i) * 0.2).toFixed(2)),
    };
  });
  await db.from("metrics_daily").insert(metrics);

  // 6. Notifications (only if the user has none)
  const { count: notifCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true });
  if ((notifCount ?? 0) === 0) {
    await db.from("notifications").insert(
      NOTIFICATIONS.map((n) => ({
        user_id: user.id,
        store_id: storeId,
        type: n.type,
        severity: n.severity,
        icon: n.icon,
        title: n.title,
        body: n.body,
        read: n.read,
      }))
    );
  }

  return NextResponse.json({
    ok: true,
    storeId,
    created: {
      products: PRODUCTS.length,
      campaigns: CAMPAIGNS.length,
      metrics: metrics.length,
    },
  });
}
