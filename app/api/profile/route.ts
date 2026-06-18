import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

  const name = storeName?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nom de boutique manquant" }, { status: 400 });
  }

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  const db = supabase as unknown as SupabaseClient;
  await db.from("stores").update({ name }).eq("id", storeId);

  return NextResponse.json({ ok: true, storeName: name });
}
