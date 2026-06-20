import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { exchangeStripeCode, syncStripe } from "@/services/integrations/stripe";

/**
 * GET /api/integrations/stripe/oauth/callback
 * Verifies the OAuth redirect (state), exchanges the code for the connected
 * account's token, links it to the logged-in user's store, and runs an initial
 * sync. Then redirects back to /integrations.
 */
export async function GET(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const err = (reason: string) =>
    NextResponse.redirect(`${env.siteUrl}/integrations?stripe=error&reason=${reason}`);

  if (params.provider !== "stripe") return err("provider");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return err("denied");
  if (!code) return err("params");

  // CSRF: state must match the cookie set when the grant started.
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("stripe_oauth_state="))
    ?.split("=")[1];
  if (!state || state !== cookieState) return err("state");

  const result = await exchangeStripeCode(code);
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
      provider: "stripe",
      status: "connected",
      access_token: result.accessToken,
      connected_at: new Date().toISOString(),
      metadata: { stripe_user_id: result.stripeUserId },
    },
    { onConflict: "store_id,provider" }
  );

  // Initial sync — best-effort, connection still succeeds if it hiccups.
  try {
    await syncStripe(result.accessToken, storeId, db);
  } catch (e) {
    console.error("[stripe] initial sync failed", e);
  }

  const res = NextResponse.redirect(`${env.siteUrl}/integrations?stripe=connected`);
  res.cookies.delete("stripe_oauth_state");
  return res;
}
