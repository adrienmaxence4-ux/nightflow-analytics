import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { decryptToken } from "@/lib/integrations/crypto";
import { getKeyedProvider } from "@/services/integrations/registry";

/**
 * POST /api/integrations/[provider]/sync
 * Re-syncs a key-based provider using the stored key for the user's store.
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

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  // Credentials + the sync writes run service-role, scoped to the store this
  // user was just verified (via their own RLS client) to own.
  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }

  const { data: integ } = await db
    .from("integrations")
    .select("access_token, status")
    .eq("store_id", storeId)
    .eq("provider", def.id)
    .limit(1);
  const row = integ?.[0] as
    | { access_token: string | null; status: string }
    | undefined;

  if (!row || row.status !== "connected" || !row.access_token) {
    return NextResponse.json(
      { error: `${def.label} non connecté` },
      { status: 400 }
    );
  }

  const token = decryptToken(row.access_token);
  if (!token) {
    return NextResponse.json(
      { error: `${def.label} : jeton illisible, reconnecte le compte` },
      { status: 400 }
    );
  }

  try {
    const summary = await def.sync(token, storeId, db);
    // Record the successful sync so the UI shows "Dernière synchro".
    await db
      .from("integrations")
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq("store_id", storeId)
      .eq("provider", def.id);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error(`[${def.id}] sync failed`, e);
    return NextResponse.json({ error: "Synchronisation échouée" }, { status: 500 });
  }
}
