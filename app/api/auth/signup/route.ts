import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import { parseSignup } from "@/lib/signup";
import { frenchAuthError, isCaptchaError } from "@/lib/auth-errors";
import { ownedStoreId } from "@/lib/store";
import { env, isHcaptchaConfigured } from "@/lib/env";

/**
 * POST /api/auth/signup
 * body: { fullName, storeName, storeUrl, platform, email, password, captchaToken? }
 *
 * L'inscription passe par ici et non par `supabase.auth.signUp` côté client,
 * pour que les règles (email jetable refusé, adresse de boutique obligatoire
 * et normalisée) soient appliquées avant la création du compte, avec un
 * message clair. Le jeton hCaptcha est transmis tel quel : c'est Supabase qui
 * le vérifie.
 *
 * La boutique est créée avec le service role : quand la confirmation d'email
 * est active, `signUp` ne rend pas de session, donc pas de JWT pour écrire
 * sous RLS. La ligne n'est posée que pour un compte né à l'instant et sans
 * boutique : rejouer l'inscription avec l'email non confirmé de quelqu'un
 * d'autre ne peut pas lui accrocher une boutique.
 */
export const dynamic = "force-dynamic";

const FRESH_ACCOUNT_MS = 2 * 60_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseSignup(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 });
  }
  const { fullName, storeName, storeDomain, platform, email, password, captchaToken } =
    parsed.value;

  if (isHcaptchaConfigured && !captchaToken) {
    return NextResponse.json(
      { error: "Complétez la vérification anti-robot.", field: "captcha" },
      { status: 400 }
    );
  }
  if (!rateLimit(`signup:${email}`, 3, 3_600_000) || !rateLimit("signup:global", 30, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      emailRedirectTo: `${env.siteUrl}/auth/callback`,
      data: { full_name: fullName, store_name: storeName },
    },
  });
  if (error) {
    // Un jeton refusé avec une sitekey valide = secret hCaptcha mal configuré
    // dans Supabase, pas une faute de l'utilisateur. Le détail va dans les logs.
    if (isCaptchaError(error.message)) {
      console.error("[signup] captcha refusé par Supabase:", error.message);
    }
    // Confirmation d'email désactivée : Supabase dit « already registered ».
    // Même réponse qu'une inscription, pour ne pas confirmer qu'un email est
    // client — l'intéressé passe par « Mot de passe oublié ».
    if (/already (been )?registered|already exists/i.test(error.message)) {
      return NextResponse.json({ ok: true, needsConfirmation: true });
    }
    return NextResponse.json({ error: frenchAuthError(error.message) }, { status: 400 });
  }

  // Email déjà inscrit + confirmation active : Supabase renvoie un utilisateur
  // sans identité au lieu d'une erreur (anti-énumération), ou l'utilisateur
  // existant s'il n'a pas encore confirmé. Même réponse qu'une vraie
  // inscription ; la boutique n'est posée que sur un compte né à l'instant.
  const user = data.user;
  const fresh =
    !!user &&
    (user.identities?.length ?? 0) > 0 &&
    Date.now() - new Date(user.created_at).getTime() < FRESH_ACCOUNT_MS;
  const admin = fresh ? createAdminClient() : null;
  if (fresh && !admin) {
    console.error("[signup] service role absent — boutique non créée pour", user.id);
  }
  if (fresh && admin) {
    const db = admin as unknown as SupabaseClient;
    if (await ownedStoreId(db, user.id)) {
      console.error("[signup] compte neuf avec boutique déjà présente, rien créé:", user.id);
    } else {
      const { error: storeErr } = await db.from("stores").insert({
        owner_id: user.id,
        name: storeName,
        platform,
        domain: storeDomain,
        currency: "EUR",
      });
      if (storeErr) console.error("[signup] création boutique refusée:", storeErr.message);
    }
  }

  return NextResponse.json({ ok: true, needsConfirmation: !data.session });
}
