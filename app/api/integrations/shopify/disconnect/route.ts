import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ownedStoreId } from "@/lib/store";

/**
 * POST /api/integrations/shopify/disconnect
 * Marks the Shopify integration disconnected and clears the stored token.
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
  if (!storeId) return NextResponse.json({ ok: true });

  const db = supabase as unknown as SupabaseClient;
  await db
    .from("integrations")
    .update({ status: "disconnected", access_token: null })
    .eq("store_id", storeId)
    .eq("provider", "shopify");

  return NextResponse.json({ ok: true });
}
