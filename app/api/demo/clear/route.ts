import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/demo/clear
 * Removes the seeded MoonStore demo data for the logged-in user's store,
 * keeping real synced data (e.g. Shopify products). After this, the app shows
 * only the user's real store.
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

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json({ ok: true, cleared: false });

  const db = supabase as unknown as SupabaseClient;

  // Demo products (keep real synced products with numeric external_ids).
  await db
    .from("products")
    .delete()
    .eq("store_id", storeId)
    .in("external_id", DEMO_PRODUCT_IDS);

  // These tables only hold demo data so far → clear them entirely.
  await db.from("metrics_daily").delete().eq("store_id", storeId);
  await db.from("campaigns").delete().eq("store_id", storeId);
  await db.from("ai_analysis_history").delete().eq("store_id", storeId);
  await db.from("notifications").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true, cleared: true });
}
