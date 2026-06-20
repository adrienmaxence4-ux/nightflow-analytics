import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getOAuthProvider } from "@/services/integrations/oauth-registry";

/**
 * GET /api/integrations/[provider]/oauth
 * Starts the "Connect with <provider>" OAuth grant: stores a CSRF state cookie
 * (plus a PKCE verifier when the provider requires it) and redirects to the
 * provider's authorize screen.
 */
function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function GET(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const def = getOAuthProvider(params.provider);
  if (!def) {
    return new NextResponse("OAuth indisponible pour ce fournisseur", {
      status: 404,
    });
  }
  if (!def.isConfigured) {
    return NextResponse.redirect(
      `${env.siteUrl}/integrations?${def.id}=notconfigured`
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const cookieOpts = {
    httpOnly: true,
    secure: env.siteUrl.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  let url: string;
  let verifier: string | null = null;
  if (def.usesPkce) {
    verifier = base64url(crypto.randomBytes(32));
    const challenge = base64url(
      crypto.createHash("sha256").update(verifier).digest()
    );
    url = def.buildAuthorizeUrl(state, challenge);
  } else {
    url = def.buildAuthorizeUrl(state);
  }

  const res = NextResponse.redirect(url);
  res.cookies.set(`${def.id}_oauth_state`, state, cookieOpts);
  if (verifier) res.cookies.set(`${def.id}_oauth_verifier`, verifier, cookieOpts);
  return res;
}
