import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { encryptToken } from "@/lib/integrations/crypto";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import {
  isValidShopDomain,
  syncShopify,
  validateShopifyToken,
} from "@/services/integrations/shopify";
import { getUserSubscription } from "@/services/billing/subscription";

/**
 * POST /api/integrations/shopify/token   body: { shop, token }
 *
 * Connects a Shopify store with an Admin API access token from a custom app
 * the merchant created in their own admin (Settings → Apps → Develop apps).
 * Same persistence and first sync as the OAuth callback — the token is the
 * same kind of credential — but it needs no Shopify app review: until the
 * public app is approved, this is how any store other than the owner's
 * development store can connect.
 */
export const dynamic = "force-dynamic";
// Validation (2 calls) + first sync (paginated) — same budget as the cron.
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    shop?: unknown;
    token?: unknown;
  } | null;
  const shop = typeof body?.shop === "string" ? normalizeShop(body.shop) : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.json(
      { error: "Indiquez l'adresse .myshopify.com de votre boutique." },
      { status: 400 }
    );
  }
  if (!token) {
    return NextResponse.json({ error: "Collez le jeton Admin API (shpat_…)." }, { status: 400 });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 400 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!rateLimit(`shopify-token:${user.id}`, 5, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }
  const { plan } = await getUserSubscription();
  if (!plan.integrations) {
    return NextResponse.json(
      { error: "Les intégrations nécessitent le plan Pro (essai gratuit inclus)." },
      { status: 403 }
    );
  }

  const check = await validateShopifyToken(shop, token);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  const writer = (createAdminClient() ??
    (supabase as unknown as SupabaseClient)) as SupabaseClient;

  let storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) {
    const { data: created, error: storeErr } = await writer
      .from("stores")
      .insert({
        owner_id: user.id,
        name: check.shopName,
        slug: shop.replace(".myshopify.com", ""),
        platform: "shopify",
        domain: shop,
        currency: "EUR",
      })
      .select("id")
      .single();
    if (storeErr) console.error("[shopify] store create failed", storeErr);
    storeId = (created as { id: string } | null)?.id ?? null;
  }
  if (!storeId) return NextResponse.json({ error: "Boutique introuvable." }, { status: 500 });

  // Switching this store to a DIFFERENT shop (e.g. the owner's test shop was
  // linked first): the daily series is upserted per date, so days the old shop
  // sold on and the new one did not would survive and blend two stores' revenue.
  // Wipe the window first, and make the store carry the new shop's identity.
  const { data: existing } = await writer
    .from("integrations")
    .select("metadata")
    .eq("store_id", storeId)
    .eq("provider", "shopify")
    .limit(1);
  const previousShop = (existing?.[0] as { metadata?: { shop?: string } } | undefined)?.metadata
    ?.shop;
  if (previousShop && previousShop !== shop) {
    const since = new Date();
    since.setDate(since.getDate() - 60);
    await writer
      .from("metrics_daily")
      .delete()
      .eq("store_id", storeId)
      .gte("date", since.toISOString().slice(0, 10));
    await writer
      .from("stores")
      .update({ name: check.shopName, domain: shop, platform: "shopify" })
      .eq("id", storeId)
      .eq("owner_id", user.id);
  }

  const { error: upsertErr } = await writer.from("integrations").upsert(
    {
      store_id: storeId,
      provider: "shopify",
      status: "connected",
      access_token: encryptToken(token),
      connected_at: new Date().toISOString(),
      last_error: null,
      metadata: { shop, auth: "custom_app_token" },
    },
    { onConflict: "store_id,provider" }
  );
  if (upsertErr) {
    console.error("[shopify] integration upsert failed", upsertErr);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }

  // First sync inline so the merchant sees numbers right away; a hiccup here
  // does not undo the connection, the hourly cron retries.
  let synced: Awaited<ReturnType<typeof syncShopify>> | null = null;
  try {
    synced = await syncShopify(shop, token, storeId, writer);
  } catch (e) {
    console.error("[shopify] initial sync failed", e);
  }

  return NextResponse.json({ ok: true, shop, shopName: check.shopName, synced });
}

/** "https://Ma-Boutique.myshopify.com/admin" → "ma-boutique.myshopify.com". */
function normalizeShop(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  return s.includes(".") ? s : `${s}.myshopify.com`;
}
