import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { PRODUCTS } from "@/services/mock/data";
import { parseMetric } from "@/utils/format";
import type { ProductRow } from "@/types/database";

/**
 * POST /api/demo/scenario   body: { scenario }
 * ADMIN-ONLY test tool. (Re)seeds the user's store with ~45 days of data crafted
 * to trigger ONE specific detection, so each alert type can be tested in
 * isolation. Creates the MoonStore demo products first if the store is empty.
 */
const DAYS = 45;

type Scenario =
  | "healthy"
  | "revenue_drop"
  | "conversion_drop"
  | "stockout"
  | "low_stock"
  | "losing_campaign"
  | "no_sales";

const EXPECTED: Record<Scenario, string> = {
  healthy: "Aucune anomalie — « Tout est au vert » + campagnes gagnantes.",
  revenue_drop: "Alerte critique « Chiffre d'affaires en baisse ».",
  conversion_drop: "Alerte « Taux de conversion en baisse ».",
  stockout: "Alerte critique « Rupture de stock » sur le best-seller.",
  low_stock: "Alerte « Stock faible » sur le best-seller.",
  losing_campaign: "Alerte critique « tu perds de l'argent » (ROAS < 1).",
  no_sales: "Alerte critique « Du trafic mais aucune vente ».",
};

const HEALTHY_CHANNELS = [
  { channel: "TikTok Ads", spend: 1800, rev: 6200 },
  { channel: "Meta Ads", spend: 1500, rev: 4100 },
  { channel: "Google Ads", spend: 1200, rev: 5200 },
  { channel: "Klaviyo Email", spend: 320, rev: 6080 },
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const round2 = (n: number) => Number(n.toFixed(2));

export async function POST(req: Request) {
  const { scenario } = (await req.json().catch(() => ({}))) as {
    scenario?: string;
  };
  const sc = (scenario ?? "healthy") as Scenario;
  if (!(sc in EXPECTED)) {
    return NextResponse.json({ error: "Scénario inconnu" }, { status: 400 });
  }

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
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const db = supabase as unknown as SupabaseClient;

  // Store — create one if the admin has none yet.
  const { data: storeRows } = await supabase.from("stores").select("id").limit(1);
  let storeId = (storeRows?.[0] as { id: string } | undefined)?.id ?? null;
  if (!storeId) {
    const { data: created } = await db
      .from("stores")
      .insert({ owner_id: user.id, name: "MoonStore", slug: "moonstore", platform: "shopify", currency: "EUR" })
      .select("id")
      .single();
    storeId = (created as { id: string } | null)?.id ?? null;
  }
  if (!storeId) {
    return NextResponse.json({ error: "Création boutique échouée" }, { status: 500 });
  }

  // Products — create the MoonStore demo catalogue if empty.
  let { data: prodData } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId);
  if (!prodData || prodData.length === 0) {
    await db.from("products").insert(
      PRODUCTS.map((p) => {
        const revenueCents = parseMetric(p.revenue) * 100;
        return {
          store_id: storeId,
          external_id: p.id,
          name: p.name,
          icon: p.icon,
          price_cents: p.sales > 0 ? Math.round(revenueCents / p.sales) : 4000,
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
    const re = await supabase.from("products").select("*").eq("store_id", storeId);
    prodData = re.data;
  }
  const products = (prodData as ProductRow[] | null) ?? [];
  if (products.length === 0) {
    return NextResponse.json({ error: "Aucun produit" }, { status: 500 });
  }

  // ── 1) Daily metrics tuned to the scenario ──
  const today = new Date();
  let totalOrders = 0;
  let totalRevCents = 0;
  const rows = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.7 : 1;
    const recent = i < 7; // current detection window
    const prevWin = i >= 7 && i < 14; // previous window

    let visitors: number;
    let conversion: number;
    let orders: number;
    let revenueCents: number;

    if (sc === "no_sales") {
      visitors = Math.round(rand(280, 520) * weekend);
      conversion = 0;
      orders = 0;
      revenueCents = 0;
    } else if (sc === "revenue_drop") {
      // Recent window ~45% of the previous window → ~55% drop (critical).
      const mult = recent ? 0.45 : prevWin ? 1.25 : 0.85;
      visitors = Math.round(rand(300, 460) * weekend * mult);
      conversion = rand(1.9, 2.8);
      orders = Math.max(0, Math.round((visitors * conversion) / 100));
      revenueCents = orders * Math.round(rand(50, 62)) * 100;
    } else if (sc === "conversion_drop") {
      visitors = Math.round(rand(320, 520) * weekend);
      conversion = recent ? rand(1.2, 1.6) : rand(2.8, 3.6);
      orders = Math.max(0, Math.round((visitors * conversion) / 100));
      revenueCents = orders * Math.round(rand(50, 62)) * 100;
    } else {
      // healthy + stockout + low_stock + losing_campaign share a healthy base.
      const trend = 1 + (DAYS - i) / (DAYS * 2.5);
      visitors = Math.round(rand(240, 520) * weekend * trend);
      conversion = rand(1.8, 3.2);
      orders = Math.max(0, Math.round((visitors * conversion) / 100));
      revenueCents = orders * Math.round(rand(48, 64)) * 100;
    }

    totalOrders += orders;
    totalRevCents += revenueCents;
    rows.push({
      store_id: storeId,
      date: d.toISOString().slice(0, 10),
      revenue_cents: revenueCents,
      orders,
      visitors,
      conversion: round2(conversion),
    });
  }
  await db.from("metrics_daily").upsert(rows, { onConflict: "store_id,date" });

  // ── 2) Product snapshots + scenario perturbation ──
  const weights = products.map(() => rand(0.5, 1.5));
  const wSum = weights.reduce((t, w) => t + w, 0);
  let topIdx = 0;
  for (let i = 1; i < weights.length; i++) if (weights[i] > weights[topIdx]) topIdx = i;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const share = weights[i] / wSum;
    const noSales = sc === "no_sales";
    const sales = noSales ? 0 : Math.round(totalOrders * share);
    const revenueCents = noSales ? 0 : Math.round(totalRevCents * share);
    const up = Math.random() > 0.3;

    let stock = Math.round(rand(60, 200));
    if (i === topIdx && sc === "stockout") stock = 0;
    if (i === topIdx && sc === "low_stock") stock = 8;

    await db
      .from("products")
      .update({
        sales,
        revenue_cents: revenueCents,
        revenue_share: noSales ? 0 : Math.round(share * 100),
        conversion: round2(rand(1.6, 3.8)),
        trend: up ? "up" : "down",
        delta: `${up ? "+" : "-"}${Math.round(rand(8, 26))}%`,
        stock,
      })
      .eq("id", p.id);
  }

  // ── 3) Campaigns ──
  await db.from("campaigns").delete().eq("store_id", storeId);
  if (sc !== "no_sales") {
    const channels =
      sc === "losing_campaign"
        ? [
            { channel: "Meta Ads", spend: 4200, rev: 1500 }, // ROAS 0.36 → critical
            { channel: "Google Ads", spend: 1200, rev: 5200 },
            { channel: "Klaviyo Email", spend: 320, rev: 6080 },
          ]
        : HEALTHY_CHANNELS;
    await db.from("campaigns").insert(
      channels.map((c) => ({
        store_id: storeId,
        channel: c.channel,
        status: "active",
        spend_cents: c.spend * 100,
        revenue_cents: c.rev * 100,
        trend: c.rev / c.spend > 3 ? "up" : "down",
        delta: `${Math.round(rand(3, 22))}%`,
      }))
    );
  }

  return NextResponse.json({
    ok: true,
    scenario: sc,
    message: `Scénario « ${sc} » appliqué ✓ → ${EXPECTED[sc]}`,
    expected: EXPECTED[sc],
  });
}
