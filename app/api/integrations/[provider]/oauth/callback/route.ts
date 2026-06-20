import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getOAuthProvider } from "@/services/integrations/oauth-registry";

/**
 * GET /api/integrations/[provider]/oauth/callback
 * Verifies the OAuth redirect (state + PKCE), exchanges the code for the
 * connected account's token, links it to the logged-in user's store, runs an
 * initial sync, then redirects back to /integrations.
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
  const err = (reason: string) =>
    NextResponse.redirect(
      `${env.siteUrl}/integrations?${params.provider}=error&reason=${reason}`
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

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return err("store");

  const db = supabase as unknown as SupabaseClient;
  await db.from("integrations").upsert(
    {
      store_id: storeId,
      provider: def.id,
      status: "connected",
      access_token: result.accessToken,
      connected_at: new Date().toISOString(),
      metadata: result.metadata ?? {},
    },
    { onConflict: "store_id,provider" }
  );

  // Initial sync — best-effort, connection still succeeds if it hiccups.
  try {
    await def.sync(result.accessToken, storeId, db);
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
