import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { getStoredTokens } from "@/lib/integrations/tokens";
import { getKeyedProvider } from "@/services/integrations/registry";
import { getOAuthProvider } from "@/services/integrations/oauth-registry";
import { invalidateSocialCache } from "@/services/social/overview";

/**
 * POST /api/integrations/[provider]/disconnect
 * Marks a provider (key-based or OAuth) disconnected and clears every stored
 * credential — the refresh token included, or a "disconnected" TikTok could be
 * silently revived by the next refresh. Providers that expose a revocation
 * endpoint are told too, so the grant dies on their side as well.
 */
export async function POST(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const def = getKeyedProvider(params.provider) ?? getOAuthProvider(params.provider);
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
  if (!storeId) return NextResponse.json({ ok: true });

  // Token columns are hidden from the user client; the revocation call needs
  // the plaintext, so it is read service-role for the store just verified —
  // and the erase runs on the same client, so a stale user JWT cannot leave a
  // row "connected" behind a card that says "déconnecté".
  const admin = createAdminClient();
  const db = (admin ?? supabase) as unknown as SupabaseClient;

  const revoke = "revoke" in def ? def.revoke : undefined;
  if (revoke && admin) {
    const tokens = await getStoredTokens(db, storeId, def.id);
    if (tokens) await revoke(tokens);
  }

  const { error } = await db
    .from("integrations")
    .update({
      status: "disconnected",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    })
    .eq("store_id", storeId)
    .eq("provider", def.id);
  if (error) {
    console.error(`[${def.id}] disconnect failed`, error);
    return NextResponse.json(
      { error: "Déconnexion impossible — réessaie." },
      { status: 500 }
    );
  }

  invalidateSocialCache(storeId);
  return NextResponse.json({ ok: true });
}
