import crypto from "crypto";
import { NextResponse } from "next/server";
import { env, isShopifyConfigured } from "@/lib/env";
import { buildAuthorizeUrl, isValidShopDomain } from "@/services/integrations/shopify";

/**
 * GET /api/integrations/shopify?shop=xxx.myshopify.com
 * App URL entry point. Starts the OAuth grant by redirecting to Shopify with a
 * CSRF state stored in a cookie.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop");

  if (!isShopifyConfigured) {
    return new NextResponse("Shopify non configuré (Client ID/secret manquants)", {
      status: 500,
    });
  }
  if (!shop || !isValidShopDomain(shop)) {
    return new NextResponse("Paramètre 'shop' invalide", { status: 400 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeUrl(shop, state));
  const cookieOpts = {
    httpOnly: true,
    secure: env.siteUrl.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set("shopify_oauth_state", state, cookieOpts);
  res.cookies.set("shopify_oauth_shop", shop, cookieOpts);
  return res;
}
