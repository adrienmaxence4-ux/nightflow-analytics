import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { decryptToken } from "@/lib/integrations/crypto";
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

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  // Credentials + sync writes run service-role, scoped to the verified store.
  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }

  const { data: integ } = await db
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

  const token = decryptToken(row.access_token);
  if (!token) {
    return NextResponse.json(
      { error: "Jeton Shopify illisible, reconnecte la boutique" },
      { status: 400 }
    );
  }

  try {
    const summary = await syncShopify(shop, token, storeId, db);
    // Record the successful sync so the UI shows "Dernière synchro".
    await db
      .from("integrations")
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq("store_id", storeId)
      .eq("provider", "shopify");
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[shopify] sync failed", e);
    return NextResponse.json({ error: "Sync échouée" }, { status: 500 });
  }
}
