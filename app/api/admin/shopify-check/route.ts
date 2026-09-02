import { NextResponse } from "next/server";
import { env, isShopifyConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * GET /api/admin/shopify-check — ADMIN ONLY.
 *
 * Answers one question: can a merchant actually complete the Shopify OAuth
 * grant, or will it fail before it starts? The install breaks for reasons that
 * are invisible from the app UI — a stale App URL, a redirect URL that isn't
 * whitelisted, NEXT_PUBLIC_SITE_URL still pointing at localhost — and Shopify
 * only surfaces them mid-redirect ("redirect_uri and application url must have
 * matching hosts").
 *
 * So it reports the EXACT strings the OAuth flow will send, ready to paste into
 * the Shopify app config, plus whether the credentials are present at all.
 *
 * NEVER returns the client secret — presence and length only.
 */
export const dynamic = "force-dynamic";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const siteUrl = env.siteUrl;
  let host = "";
  let httpsOk = false;
  try {
    const u = new URL(siteUrl);
    host = u.host;
    httpsOk = u.protocol === "https:";
  } catch {
    /* siteUrl malformed — caught by the check below */
  }
  const isLocalhost = /^(localhost|127\.|0\.0\.0\.0)/.test(host);
  // Deploy-specific Vercel URLs (nightflow-abc123-team.vercel.app) change every
  // push, so an App URL pinned to one is a redirect that rots. The stable alias
  // is the only safe value.
  const looksEphemeral = /-[a-z0-9]{6,}-[a-z0-9-]+\.vercel\.app$/.test(host);

  const appUrl = `${siteUrl}/api/integrations/shopify`;
  const redirectUri = `${siteUrl}/api/integrations/shopify/callback`;
  const scopes = env.shopifyScopes;

  const clientId = env.shopifyClientId;
  const secret = env.shopifyClientSecret;

  const checks: Check[] = [
    {
      name: "SHOPIFY_CLIENT_ID",
      ok: clientId.length > 0,
      detail: clientId
        ? `${clientId.slice(0, 6)}… (${clientId.length} caractères)`
        : "⚠️ Absent — /api/integrations/shopify renverra 500 avant même la redirection.",
    },
    {
      name: "SHOPIFY_CLIENT_SECRET",
      ok: secret.length > 0,
      detail: secret
        ? `Présent (${secret.length} caractères) — jamais affiché ici.`
        : "⚠️ Absent — l'échange du code OAuth échouera (reason=token).",
    },
    {
      name: "NEXT_PUBLIC_SITE_URL",
      ok: httpsOk && !isLocalhost && !looksEphemeral,
      detail: !host
        ? `⚠️ Valeur illisible : « ${siteUrl} »`
        : isLocalhost
          ? `⚠️ Pointe sur ${host} — aucune redirection Shopify ne fonctionnera en prod.`
          : !httpsOk
            ? `⚠️ ${host} sans https — Shopify exige https.`
            : looksEphemeral
              ? `⚠️ ${host} ressemble à une URL de déploiement Vercel (change à chaque push). Utilise l'alias stable.`
              : `${host} ✓`,
    },
    {
      name: "App URL (host à faire correspondre)",
      ok: httpsOk && !isLocalhost,
      detail: `Dans la config de l'app Shopify, « App URL » doit être sur le host « ${host || "?"} ». Erreur « matching hosts » = ce champ pointe ailleurs.`,
    },
    {
      name: "Scopes demandés",
      ok: scopes.length > 0,
      detail: scopes || "⚠️ Aucun scope — SHOPIFY_SCOPES vide.",
    },
  ];

  const blockers = checks.filter((c) => !c.ok).map((c) => c.name);
  const working = isShopifyConfigured && httpsOk && !isLocalhost;

  return NextResponse.json({
    working,
    verdict: working
      ? "Config prête. Si l'install échoue encore, c'est côté app Shopify : colle exactement l'URL de redirection ci-dessous dans « Allowed redirection URL(s) », puis release une nouvelle version."
      : `Bloqué : ${blockers.join(", ")}.`,
    // The exact strings to paste into the Shopify app configuration.
    appUrl,
    redirectUri,
    scopes,
    host,
    checks,
  });
}
