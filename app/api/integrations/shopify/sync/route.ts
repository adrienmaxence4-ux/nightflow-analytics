import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { syncShopify } from "@/services/integrations/shopify";

/**
 * POST /api/integrations/shopify/sync
 * Re-syncs products & orders for the logged-in user's connected Shopify store
 * using the stored access token.
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

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  const { data: integ } = await supabase
    .from("integrations")
    .select("access_token, metadata, status")
    .eq("store_id", storeId)
    .eq("provider", "shopify")
    .limit(1);
  const row = integ?.[0] as
    | { access_token: string | null; metadata: { shop?: string }; status: string }
    | undefined;

  if (!row || row.status !== "connected" || !row.access_token) {
    return NextResponse.json({ error: "Shopify non connecté" }, { status: 400 });
  }
  const shop = row.metadata?.shop;
  if (!shop) {
    return NextResponse.json({ error: "Domaine boutique manquant" }, { status: 400 });
  }

  try {
    const db = supabase as unknown as SupabaseClient;
    const summary = await syncShopify(shop, row.access_token, storeId, db);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[shopify] sync failed", e);
    return NextResponse.json({ error: "Sync échouée" }, { status: 500 });
  }
}
