import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
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

  // Link the token to the user's store and sync.
  const supabase = createClient();
  if (!supabase) return err("supabase");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Not logged in to Nightflow in this browser — ask them to sign in first.
    return NextResponse.redirect(`${env.siteUrl}/login?next=/integrations`);
  }

  const db = supabase as unknown as SupabaseClient;

  // Ensure a store exists (create one named after the shop on first connect).
  const existingStore = await supabase.from("stores").select("id").limit(1);
  let storeId =
    (existingStore.data?.[0] as { id: string } | undefined)?.id ?? null;
  if (!storeId) {
    const { data: created } = await db
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
    storeId = (created as { id: string } | null)?.id ?? null;
  }
  if (!storeId) return err("store");

  // Persist the integration with the token encrypted at rest.
  await db.from("integrations").upsert(
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

  // Initial sync (best-effort — connection still succeeds if it hiccups).
  try {
    await syncShopify(shop, token, storeId, db);
  } catch (e) {
    console.error("[shopify] initial sync failed", e);
  }

  const res = NextResponse.redirect(`${env.siteUrl}/dashboard?connected=shopify`);
  res.cookies.delete("shopify_oauth_state");
  res.cookies.delete("shopify_oauth_shop");
  return res;
}
