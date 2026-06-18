import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getKeyedProvider } from "@/services/integrations/registry";

/**
 * POST /api/integrations/[provider]/disconnect
 * Marks a key-based provider disconnected and clears the stored key.
 */
export async function POST(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const def = getKeyedProvider(params.provider);
  if (!def) {
    return NextResponse.json({ error: "Fournisseur inconnu" }, { status: 404 });
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

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json({ ok: true });

  const db = supabase as unknown as SupabaseClient;
  await db
    .from("integrations")
    .update({ status: "disconnected", access_token: null })
    .eq("store_id", storeId)
    .eq("provider", def.id);

  return NextResponse.json({ ok: true });
}
