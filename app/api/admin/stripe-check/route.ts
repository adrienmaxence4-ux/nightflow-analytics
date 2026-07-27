import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * GET /api/admin/stripe-check — ADMIN ONLY.
 * Definitive test-vs-live audit of every Stripe surface. Key MODE is read from
 * the key prefix (Stripe guarantees sk_live_/sk_test_), and the key is then
 * exercised against /v1/account to confirm it is valid and that the account can
 * actually take real payments. Never returns a secret — only prefixes/verdicts.
 */
export const dynamic = "force-dynamic";

type Mode = "live" | "test" | "absent" | "inconnu";

interface StripeAccount {
  id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  country?: string;
  default_currency?: string;
}

function keyMode(key: string): Mode {
  if (!key) return "absent";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "inconnu";
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

  const secretMode = keyMode(env.stripeSecretKey);
  const checks: {
    name: string;
    mode: Mode;
    ok: boolean;
    detail: string;
  }[] = [];

  // ── 1. Platform secret key ──
  checks.push({
    name: "Clé secrète (paiements)",
    mode: secretMode,
    ok: secretMode === "live",
    detail:
      secretMode === "live"
        ? "sk_live_… — encaisse de vrais paiements"
        : secretMode === "test"
          ? "⚠️ sk_test_… — les paiements sont FICTIFS"
          : secretMode === "absent"
            ? "⚠️ STRIPE_SECRET_KEY absente"
            : "⚠️ format de clé inattendu",
  });

  // ── 2. Does the key work, and is the account able to take money? ──
  let account: StripeAccount | null = null;
  let accountError: string | null = null;
  if (env.stripeSecretKey) {
    try {
      const res = await fetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${env.stripeSecretKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json()) as StripeAccount & {
        error?: { message?: string };
      };
      if (res.ok) account = body;
      else accountError = body?.error?.message ?? `HTTP ${res.status}`;
    } catch {
      accountError = "Stripe injoignable";
    }
  }
  checks.push({
    name: "Compte Stripe",
    mode: secretMode,
    ok: !!account?.charges_enabled,
    detail: account
      ? account.charges_enabled
        ? `Activé (${account.country ?? "?"}, ${(account.default_currency ?? "eur").toUpperCase()}) — encaissement autorisé`
        : "⚠️ Le compte ne peut pas encore encaisser (activation incomplète)"
      : `⚠️ ${accountError ?? "clé absente"}`,
  });

  // ── 3. Webhook signing secret ──
  const whsec = env.stripeWebhookSecret;
  checks.push({
    name: "Signature webhook",
    mode: whsec ? "inconnu" : "absent",
    ok: whsec.startsWith("whsec_"),
    detail: whsec.startsWith("whsec_")
      ? "whsec_… configurée — les webhooks sont vérifiés"
      : "⚠️ STRIPE_WEBHOOK_SECRET absente : les webhooks Stripe seront rejetés",
  });

  // ── 4. Connect client id (import de données) ──
  // Stripe uses the ca_… prefix for BOTH modes, so the mode can't be derived —
  // it must be compared by hand with the live value in the Stripe dashboard.
  const ca = env.stripeClientId;
  checks.push({
    name: "Stripe Connect (import boutique)",
    mode: ca ? "inconnu" : "absent",
    ok: !!ca,
    detail: ca
      ? `${ca.slice(0, 6)}… — à vérifier à la main : Stripe → Paramètres → Connect → « ca_ » du mode LIVE`
      : "Non configuré (le bouton « Connecter Stripe » est simplement inactif)",
  });

  const allLive = secretMode === "live" && !!account?.charges_enabled;
  return NextResponse.json({
    verdict: allLive ? "live" : secretMode === "test" ? "test" : "incomplet",
    secretMode,
    accountId: account?.id ?? null,
    chargesEnabled: !!account?.charges_enabled,
    payoutsEnabled: !!account?.payouts_enabled,
    checks,
  });
}
