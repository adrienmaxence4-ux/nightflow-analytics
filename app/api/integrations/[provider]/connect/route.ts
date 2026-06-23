import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/integrations/crypto";
import { getKeyedProvider } from "@/services/integrations/registry";

/**
 * POST /api/integrations/[provider]/connect   body: { apiKey }
 * Connects a key-based provider (Stripe, Klaviyo, …) for the logged-in user's
 * store. Validates the pasted key, stores it (RLS-isolated), then runs an
 * initial sync. The key is the CUSTOMER's own — multi-tenant by design.
 */
export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const def = getKeyedProvider(params.provider);
  if (!def) {
    return NextResponse.json({ error: "Fournisseur inconnu" }, { status: 404 });
  }

  const { apiKey } = (await req.json().catch(() => ({}))) as { apiKey?: string };
  const key = apiKey?.trim();
  if (!key) {
    return NextResponse.json({ error: "Clé API manquante" }, { status: 400 });
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
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  const valid = await def.validate(key);
  if (!valid) {
    return NextResponse.json(
      { error: `Clé ${def.label} invalide ou sans les permissions requises` },
      { status: 400 }
    );
  }

  const db = supabase as unknown as SupabaseClient;
  await db.from("integrations").upsert(
    {
      store_id: storeId,
      provider: def.id,
      status: "connected",
      access_token: encryptToken(key),
      metadata: {},
      connected_at: new Date().toISOString(),
    },
    { onConflict: "store_id,provider" }
  );

  // Initial sync — never let a sync failure undo a valid connection.
  let summary = { orders: 0, revenueCents: 0, days: 0 };
  try {
    summary = await def.sync(key, storeId, db);
  } catch (e) {
    console.error(`[${def.id}] initial sync failed`, e);
  }

  return NextResponse.json({ ok: true, connected: true, ...summary });
}
