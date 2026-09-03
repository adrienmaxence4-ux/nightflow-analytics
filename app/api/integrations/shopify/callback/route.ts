import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { encryptToken } from "@/lib/integrations/crypto";
import {
  exchangeCodeForToken,
  isValidShopDomain,
  syncShopify,
  verifyHmac,
} from "@/services/integrations/shopify";

/**
 * GET /api/integrations/shopify/callback
 * Verifies the OAuth redirect (state + HMAC), exchanges the code for an access
 * token, links it to the logged-in user's store, and runs an initial sync.
 *
 * Identity comes from the user session; the writes go through the service-role
 * client. On a redirect back from Shopify the user JWT forwarded to PostgREST
 * can be stale, which made an RLS-guarded `integrations` upsert fail silently —
 * the route still redirected to "connected" while nothing was persisted. The
 * store id is resolved under RLS first (tenant isolation), then every write is
 * scoped to that verified id, and the upsert result is checked.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const err = (reason: string) =>
    NextResponse.redirect(`${env.siteUrl}/integrations?shopify=error&reason=${reason}`);

  if (!shop || !code || !isValidShopDomain(shop)) return err("params");

  // CSRF: state must match the cookie set at install time.
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("shopify_oauth_state="))
    ?.split("=")[1];
  if (!state || state !== cookieState) return err("state");

  if (!verifyHmac(url.searchParams)) return err("hmac");

  const token = await exchangeCodeForToken(shop, code);
  if (!token) return err("token");

  // Identity — read under the user session.
  const supabase = createClient();
  if (!supabase) return err("supabase");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Not logged in to Nightflow in this browser — ask them to sign in first.
    return NextResponse.redirect(`${env.siteUrl}/login?next=/integrations`);
  }

  // Writes — service role (session-less contexts can't carry a fresh user JWT),
  // scoped to the store id we resolve under RLS just below. Falls back to the
  // user client when the key isn't configured.
  const writer = (createAdminClient() ??
    (supabase as unknown as SupabaseClient)) as SupabaseClient;

  // Ensure a store exists (create one named after the shop on first connect).
  let storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) {
    const { data: created, error: storeErr } = await writer
      .from("stores")
      .insert({
        owner_id: user.id,
        name: shop.replace(".myshopify.com", ""),
        slug: shop.replace(".myshopify.com", ""),
        platform: "shopify",
        currency: "EUR",
      })
      .select("id")
      .single();
    if (storeErr) console.error("[shopify] store create failed", storeErr);
    storeId = (created as { id: string } | null)?.id ?? null;
  }
  if (!storeId) return err("store");

  // Persist the integration with the token encrypted at rest. A failure here
  // must NOT redirect to "connected" — that is how a broken connection went
  // unnoticed while the Copilot saw no data.
  const { error: upsertErr } = await writer.from("integrations").upsert(
    {
      store_id: storeId,
      provider: "shopify",
      status: "connected",
      access_token: encryptToken(token),
      connected_at: new Date().toISOString(),
      last_error: null,
      metadata: { shop },
    },
    { onConflict: "store_id,provider" }
  );
  if (upsertErr) {
    console.error("[shopify] integration upsert failed", upsertErr);
    return err("persist");
  }

  // Initial sync (best-effort — connection still succeeds if it hiccups, e.g.
  // a scope the store hasn't granted yet).
  try {
    await syncShopify(shop, token, storeId, writer);
  } catch (e) {
    console.error("[shopify] initial sync failed", e);
  }

  const res = NextResponse.redirect(`${env.siteUrl}/dashboard?connected=shopify`);
  res.cookies.delete("shopify_oauth_state");
  res.cookies.delete("shopify_oauth_shop");
  return res;
}
