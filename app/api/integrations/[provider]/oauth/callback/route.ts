import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { encryptToken } from "@/lib/integrations/crypto";
import { getOAuthProvider } from "@/services/integrations/oauth-registry";

/**
 * GET /api/integrations/[provider]/oauth/callback
 * Verifies the OAuth redirect (state + PKCE), exchanges the code for the
 * connected account's token, links it to the logged-in user's store, runs an
 * initial sync, then redirects back to /integrations.
 *
 * Identity comes from the user session; the writes go through the
 * service-role client. Caught live: Google Analytics completed this entire
 * flow (?google=connected on the redirect) and still showed "Non connecté"
 * after a reload — the user JWT forwarded to PostgREST on the redirect back
 * from a slow, multi-screen consent flow (account chooser → unverified-app
 * warning → scope consent) can be stale enough that the upsert is rejected,
 * and this route never checked the result. Same bug, same fix as the Shopify
 * OAuth callback: resolve the store id under RLS, write with the verified id
 * through service-role, and fail loudly instead of redirecting to "connected"
 * with nothing stored.
 */
function readCookie(req: Request, name: string): string | undefined {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}

export async function GET(
  req: Request,
  { params }: { params: { provider: string } }
) {
  // `params.provider` is a URL path segment — encode it before it goes into the
  // redirect query, so a crafted segment can't inject extra params.
  const provider = encodeURIComponent(params.provider);
  const err = (reason: string) =>
    NextResponse.redirect(
      `${env.siteUrl}/integrations?${provider}=error&reason=${reason}`
    );

  const def = getOAuthProvider(params.provider);
  if (!def) return err("provider");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return err("denied");
  if (!code) return err("params");

  // CSRF: state must match the cookie set when the grant started.
  if (!state || state !== readCookie(req, `${def.id}_oauth_state`)) {
    return err("state");
  }
  const verifier = def.usesPkce
    ? readCookie(req, `${def.id}_oauth_verifier`)
    : undefined;

  const result = await def.exchangeCode(code, verifier);
  if (!result) return err("token");

  const supabase = createClient();
  if (!supabase) return err("supabase");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${env.siteUrl}/login?next=/integrations`);
  }

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) return err("store");

  // Writes run service-role, scoped to the store id resolved above under RLS.
  const admin = createAdminClient();
  const writer = (admin ?? (supabase as unknown as SupabaseClient)) as SupabaseClient;

  const { error: upsertErr } = await writer.from("integrations").upsert(
    {
      store_id: storeId,
      provider: def.id,
      status: "connected",
      access_token: encryptToken(result.accessToken),
      connected_at: new Date().toISOString(),
      last_error: null,
      metadata: result.metadata ?? {},
    },
    { onConflict: "store_id,provider" }
  );
  if (upsertErr) {
    console.error(`[${def.id}] oauth upsert failed`, upsertErr);
    return err("persist");
  }

  // Initial sync — best-effort, connection still succeeds if it hiccups.
  try {
    await def.sync(result.accessToken, storeId, writer);
  } catch (e) {
    console.error(`[${def.id}] initial sync failed`, e);
  }

  const res = NextResponse.redirect(
    `${env.siteUrl}/integrations?${def.id}=connected`
  );
  res.cookies.delete(`${def.id}_oauth_state`);
  if (def.usesPkce) res.cookies.delete(`${def.id}_oauth_verifier`);
  return res;
}
