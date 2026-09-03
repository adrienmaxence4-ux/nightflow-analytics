import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { isAdminEmail } from "@/lib/admin";

/**
 * POST /api/demo/clear — ADMIN ONLY.
 *
 * Wipes every table that only ever holds seeded / test data for the logged-in
 * user's store, so the app runs on the real connected store alone. Real synced
 * data survives: Shopify products (numeric external_ids) and the integration
 * rows themselves are left untouched.
 *
 * The response says whether a Shopify integration is connected — the caller
 * then triggers a re-sync so the catalogue is rebuilt from the source of
 * truth (and stale products from a previously linked store get pruned).
 */

const DEMO_PRODUCT_IDS = [
  "galaxy-lamp",
  "sakura-hoodie",
  "lunar-bottle",
  "tokyo-poster",
  "nebula-mug",
  "star-projector",
];

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
  if (!isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Réservé à l'administrateur" },
      { status: 403 }
    );
  }

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) return NextResponse.json({ ok: true, cleared: false });

  // Deletes run service-role, scoped to the verified store id.
  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }

  // Orders first (order_items FKs onto them).
  const { data: orderIds } = await db
    .from("orders")
    .select("id")
    .eq("store_id", storeId);
  const ids = ((orderIds as { id: string }[] | null) ?? []).map((o) => o.id);
  if (ids.length) {
    await db.from("order_items").delete().in("order_id", ids);
  }
  await db.from("orders").delete().eq("store_id", storeId);

  // Tables that only hold seeded / derived data → clear entirely for the store.
  await db.from("metrics_daily").delete().eq("store_id", storeId);
  await db.from("campaigns").delete().eq("store_id", storeId);
  await db.from("ai_analysis_history").delete().eq("store_id", storeId);
  await db.from("insights").delete().eq("store_id", storeId);
  await db.from("recommendations").delete().eq("store_id", storeId);
  await db.from("ai_recommendations").delete().eq("store_id", storeId);
  await db.from("notifications").delete().eq("user_id", user.id);

  // Demo products by their seed ids. Real synced products (numeric external_ids)
  // stay; a re-sync then prunes any that no longer belong to the store.
  await db
    .from("products")
    .delete()
    .eq("store_id", storeId)
    .in("external_id", DEMO_PRODUCT_IDS);

  const { data: shopify } = await db
    .from("integrations")
    .select("status")
    .eq("store_id", storeId)
    .eq("provider", "shopify")
    .limit(1);
  const shopifyConnected =
    (shopify as { status: string }[] | null)?.[0]?.status === "connected";

  return NextResponse.json({ ok: true, cleared: true, shopifyConnected });
}
