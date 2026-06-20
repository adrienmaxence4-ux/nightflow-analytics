import crypto from "crypto";
import { NextResponse } from "next/server";
import { env, isStripeOAuthConfigured } from "@/lib/env";
import { buildStripeAuthorizeUrl } from "@/services/integrations/stripe";

/**
 * GET /api/integrations/stripe/oauth
 * Starts the "Connect with Stripe" OAuth grant: stores a CSRF state cookie and
 * redirects to Stripe's authorize screen. (Only Stripe supports OAuth so far.)
 */
export async function GET(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  if (params.provider !== "stripe") {
    return new NextResponse("OAuth indisponible pour ce fournisseur", {
      status: 404,
    });
  }
  if (!isStripeOAuthConfigured) {
    return NextResponse.redirect(
      `${env.siteUrl}/integrations?stripe=notconfigured`
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildStripeAuthorizeUrl(state));
  res.cookies.set("stripe_oauth_state", state, {
    httpOnly: true,
    secure: env.siteUrl.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
