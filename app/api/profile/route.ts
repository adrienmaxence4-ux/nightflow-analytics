import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ownedStoreId } from "@/lib/store";

/**
 * POST /api/profile   body: { storeName?: string }
 * Persists editable profile fields for the logged-in user's store.
 * Currently the store name (the rest are display-only presets).
 */
export async function POST(req: Request) {
  const { storeName } = (await req.json().catch(() => ({}))) as {
    storeName?: string;
  };

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

  const name = storeName?.trim().slice(0, 120);
  if (!name) {
    return NextResponse.json({ error: "Nom de boutique manquant" }, { status: 400 });
  }

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  const db = supabase as unknown as SupabaseClient;
  await db.from("stores").update({ name }).eq("id", storeId).eq("owner_id", user.id);

  return NextResponse.json({ ok: true, storeName: name });
}
