import { NextResponse } from "next/server";
import { env, isMetaOAuthConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { buildMetaAuthorizeUrl } from "@/services/integrations/meta";

/**
 * GET /api/admin/meta-check — ADMIN ONLY.
 *
 * Says which half of the Meta app credential the runtime can actually see, so
 * a "notconfigured" redirect stops being a guessing game between a typo, an
 * environment the variable was never ticked for, and a value that never got
 * saved.
 *
 * NEVER returns the app secret. Its presence and length are reported, which is
 * enough to tell "missing" from "pasted with a stray space" without the value
 * ever leaving the server. The app id and the login configuration id are public
 * — both travel in the authorize URL a browser follows — so they are shown in
 * full to make a typo obvious.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const secret = env.metaAppSecret;
  const checks = [
    {
      name: "META_APP_ID",
      ok: !!env.metaAppId,
      value: env.metaAppId || "(vide)",
      detail: env.metaAppId
        ? "Identifiant public de l'app."
        : "Absent du runtime — variable non définie, mal orthographiée, ou non cochée pour l'environnement Production.",
    },
    {
      name: "META_APP_SECRET",
      ok: !!secret,
      // Length only. A real secret is 32 hex characters; anything else points
      // at a truncated paste or a stray space.
      value: secret ? `${secret.length} caractères` : "(vide)",
      detail: secret
        ? secret.length === 32
          ? "Longueur attendue (32)."
          : `⚠️ Longueur inhabituelle (${secret.length}) — un secret Meta en fait 32. Espace ou copie tronquée ?`
        : "Absent du runtime — c'est ce qui bloque la connexion.",
    },
    {
      name: "META_LOGIN_CONFIG_ID",
      ok: !!env.metaLoginConfigId,
      value: env.metaLoginConfigId || "(vide)",
      detail: env.metaLoginConfigId
        ? "Configuration Facebook Login for Business."
        : "Absent — le connecteur retombera sur le login classique (scope), qui échoue sur une app Business.",
    },
    {
      name: "META_API_VERSION",
      ok: !!env.metaApiVersion,
      value: env.metaApiVersion,
      detail:
        "Toutes les versions Marketing API < v24.0 ont été supprimées le 2026-06-09.",
    },
  ];

  return NextResponse.json({
    configured: isMetaOAuthConfigured,
    verdict: isMetaOAuthConfigured
      ? "Meta Ads est prêt : le bouton lancera l'autorisation."
      : "Meta Ads répondra « notconfigured » tant que META_APP_ID et META_APP_SECRET ne sont pas tous deux visibles du runtime.",
    redirectUri: `${env.siteUrl}/api/integrations/meta/oauth/callback`,
    // The exact URL the button sends the browser to — the fastest way to see a
    // malformed authorize request without clicking through.
    authorizeUrl: isMetaOAuthConfigured
      ? buildMetaAuthorizeUrl("diagnostic")
      : null,
    checks,
  });
}
