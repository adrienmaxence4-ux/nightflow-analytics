import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/database";

/**
 * POST /api/demo/sample
 * Fills the logged-in user's EXISTING store with realistic TEST data — ~45 days
 * of visitors/orders/revenue (metrics_daily) + per-product sales + a few
 * marketing campaigns — so the whole app shows lively numbers. Clearable via
 * /api/demo/clear. Does NOT create demo products (keeps the real ones).
 */
const DAYS = 45;
const CHANNELS = [
  { channel: "TikTok Ads", spend: 1800, rev: 6200 },
  { channel: "Meta Ads", spend: 1500, rev: 4100 },
  { channel: "Google Ads", spend: 1200, rev: 5200 },
  { channel: "Klaviyo Email", spend: 320, rev: 6080 },
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

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

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) {
    return NextResponse.json(
      { error: "Aucune boutique — connecte une boutique d'abord." },
      { status: 404 }
    );
  }

  const { data: prodData } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId);
  const products = (prodData as ProductRow[] | null) ?? [];
  if (products.length === 0) {
    return NextResponse.json({ error: "Aucun produit dans la boutique" }, { status: 400 });
  }

  const db = supabase as unknown as SupabaseClient;

  // 1) Daily metrics for the last DAYS days (weekends quieter, slight uptrend).
  const today = new Date();
  let totalOrders = 0;
  let totalRevCents = 0;
  const rows = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const weekday = d.getDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.7 : 1;
    const trend = 1 + (DAYS - i) / (DAYS * 2.5); // gentle growth over time
    const visitors = Math.round(rand(220, 520) * weekend * trend);
    const conversion = rand(1.4, 3.4);
    const orders = Math.max(0, Math.round((visitors * conversion) / 100));
    const aovCents = Math.round(rand(42, 68)) * 100;
    const revenueCents = orders * aovCents;
    totalOrders += orders;
    totalRevCents += revenueCents;
    rows.push({
      store_id: storeId,
      date: d.toISOString().slice(0, 10),
      revenue_cents: revenueCents,
      orders,
      visitors,
      conversion: Number(conversion.toFixed(2)),
    });
  }
  await db.from("metrics_daily").upsert(rows, { onConflict: "store_id,date" });

  // 2) Distribute sales across the real products (random weights).
  const weights = products.map(() => rand(0.5, 1.5));
  const wSum = weights.reduce((t, w) => t + w, 0);
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const share = weights[i] / wSum;
    const sales = Math.round(totalOrders * share);
    const revenueCents = Math.round(totalRevCents * share);
    const up = Math.random() > 0.35;
    await db
      .from("products")
      .update({
        sales,
        revenue_cents: revenueCents,
        revenue_share: Math.round(share * 100),
        conversion: Number(rand(1.6, 3.8).toFixed(2)),
        trend: up ? "up" : "down",
        delta: `${up ? "+" : "-"}${Math.round(rand(4, 28))}%`,
      })
      .eq("id", p.id);
  }

  // 3) Marketing campaigns (replace any existing).
  await db.from("campaigns").delete().eq("store_id", storeId);
  await db.from("campaigns").insert(
    CHANNELS.map((c) => ({
      store_id: storeId,
      channel: c.channel,
      status: "active",
      spend_cents: c.spend * 100,
      revenue_cents: c.rev * 100,
      trend: c.rev / c.spend > 3 ? "up" : "down",
      delta: `${Math.round(rand(3, 22))}%`,
    }))
  );

  return NextResponse.json({
    ok: true,
    days: rows.length,
    orders: totalOrders,
    revenueCents: totalRevCents,
    products: products.length,
  });
}
