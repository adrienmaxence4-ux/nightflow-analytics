import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { encryptToken } from "@/lib/integrations/crypto";
import { getUserSubscription } from "@/services/billing/subscription";
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
  const raw = apiKey?.trim() ?? "";
  // Normalise first, so what gets stored is the credential itself rather than
  // whatever wrapper the provider's dashboard displayed around it.
  const key = def.normalize ? def.normalize(raw) : raw;
  if (!key) {
    return NextResponse.json(
      { error: def.missingKeyHint ?? "Clé API manquante" },
      { status: 400 }
    );
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

  // Integrations are a Pro+ feature (same gate as the OAuth routes).
  const { plan } = await getUserSubscription();
  if (!plan.integrations) {
    return NextResponse.json(
      { error: "Les intégrations nécessitent le plan Pro" },
      { status: 403 }
    );
  }

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) {
    return NextResponse.json({ error: "Aucune boutique" }, { status: 404 });
  }

  const validation = await def.validate(key);
  const valid = typeof validation === "boolean" ? validation : validation.ok;
  const reason = typeof validation === "boolean" ? undefined : validation.reason;
  if (!valid) {
    return NextResponse.json(
      { error: reason ?? `Clé ${def.label} invalide ou sans les permissions requises` },
      { status: 400 }
    );
  }

  // Writes run service-role, scoped to the store id resolved above under RLS.
  // The connect route previously wrote with the user's own client and never
  // checked the result — a rejected upsert (stale session JWT on this
  // request, a grants change, anything) reported success while storing
  // nothing, and the card flipped back to "not connected" a moment later with
  // no visible error. Same class of bug as the Shopify OAuth callback.
  const admin = createAdminClient();
  const writer = (admin ?? (supabase as unknown as SupabaseClient)) as SupabaseClient;

  const { error: upsertErr } = await writer.from("integrations").upsert(
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
  if (upsertErr) {
    console.error(`[${def.id}] connect upsert failed`, upsertErr);
    return NextResponse.json(
      { error: "La connexion n'a pas pu être enregistrée — réessaie." },
      { status: 500 }
    );
  }

  // Initial sync — never let a sync failure undo a valid connection (the key
  // IS valid, that's what def.validate just confirmed). But don't dress up a
  // real failure as success either: report it as a warning so "connecté ✓ —
  // 0 commandes, 0 € importés" doesn't read like everything worked.
  let summary: { orders: number; revenueCents: number; days: number } = {
    orders: 0,
    revenueCents: 0,
    days: 0,
  };
  let syncWarning: string | undefined;
  try {
    summary = await def.sync(key, storeId, writer);
  } catch (e) {
    console.error(`[${def.id}] initial sync failed`, e);
    syncWarning =
      e instanceof Error ? e.message : "Le premier import a échoué, réessaie via Synchroniser.";
  }

  return NextResponse.json({ ok: true, connected: true, ...summary, syncWarning });
}
