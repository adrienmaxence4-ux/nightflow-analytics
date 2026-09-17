import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import { ownedStore } from "@/lib/store";
import { isDisposableEmail, normalizeStoreDomain } from "@/lib/signup";
import type { StoreRow, SubscriptionRow } from "@/types/database";

/**
 * POST /api/billing/trial
 * Starts the ONE free 30-day Pro trial — no card, no Stripe.
 *
 * Anti-abuse, in order:
 *   1. confirmed email, not a disposable address;
 *   2. a registered store domain that actually serves a page on https —
 *      a 404 on `/` is a wildcard host (`anything.myshopify.com` answers
 *      404 for every unknown shop), not a store;
 *   3. `claim_pro_trial_v2()` — SECURITY DEFINER RPC that records BOTH the
 *      normalised email (gmail dots/+aliases neutralised) and the store domain
 *      in a ledger, refuses if either key was ever used, by anyone, and opens
 *      the trial (status='trialing') in the same transaction — a key can't be
 *      burnt without the trial actually starting;
 *   4. never had a paid subscription (checked in the RPC too).
 * Re-creating an account with a fresh email therefore also needs a fresh,
 * live store domain. Ownership of the domain is not proven: what this buys
 * is one live domain per attempt, not a hard wall.
 */
const SETTINGS_HINT = "dans Paramètres avant de démarrer l'essai.";

const RPC_ERRORS: Record<string, { status: number; error: string }> = {
  email_unconfirmed: {
    status: 403,
    error: "Confirmez votre adresse email (lien reçu par email) avant de démarrer l'essai.",
  },
  store_missing: {
    status: 409,
    error: `Renseignez l'adresse de votre boutique ${SETTINGS_HINT}`,
  },
  already_subscribed: {
    status: 409,
    error: "Vous avez déjà un abonnement ou un essai actif.",
  },
  already_used: {
    status: 409,
    error:
      "Les 30 jours de Pro ont déjà été utilisés pour cet email ou cette boutique ; ils ne sont offerts qu'une fois.",
  },
};

/**
 * True when https://<domain>/ serves a page. Any status but 404/410 counts —
 * a 403 from a bot shield still proves a real site. Redirects are not
 * followed: the body is never read, and following one could point the egress
 * at an internal address.
 */
async function storeAnswers(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/`, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(6_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; Nightflow/1.0)" },
    });
    return res.status !== 404 && res.status !== 410;
  } catch {
    return false;
  }
}

export async function POST() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase" }, { status: 400 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  // A real customer needs one or two attempts; more is someone probing which
  // domains already trialed (the RPC answers `already_used` without burning).
  if (!rateLimit(`trial:${user.id}`, 3, 3_600_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json(RPC_ERRORS.email_unconfirmed, { status: 403 });
  }
  if (isDisposableEmail(user.email ?? "")) {
    return NextResponse.json(
      { error: "L'essai gratuit n'est pas disponible avec une adresse email jetable." },
      { status: 403 }
    );
  }

  // Cheap early exits before the network check; the RPC re-checks all of it.
  const { data } = await supabase
    .from("subscriptions")
    .select("status, stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1);
  const row = data?.[0] as Pick<SubscriptionRow, "status" | "stripe_customer_id"> | undefined;
  if (row) {
    if (row.status === "active" || row.status === "trialing") {
      return NextResponse.json(RPC_ERRORS.already_subscribed, { status: 409 });
    }
    if (row.stripe_customer_id) {
      return NextResponse.json(
        { error: "L'essai gratuit est réservé aux comptes qui n'ont jamais été abonnés." },
        { status: 409 }
      );
    }
  }

  // A live store domain. Re-normalised here: the row is client-writable under
  // RLS (the CHECK constraint keeps the shape, not the liveness).
  const store = await ownedStore<StoreRow>(supabase, user.id);
  const domain = store?.domain ? normalizeStoreDomain(store.domain) : null;
  if (!domain) {
    return NextResponse.json(RPC_ERRORS.store_missing, { status: 409 });
  }
  if (!(await storeAnswers(domain))) {
    return NextResponse.json(
      {
        error: `Aucune boutique ne répond sur ${domain}. Vérifiez l'adresse ${SETTINGS_HINT}`,
      },
      { status: 409 }
    );
  }

  // The domain just verified is handed to the RPC: if the row changed in
  // between, it refuses instead of keying the ledger on an untested value.
  // (Untyped call: the ssr client's rpc typing rejects any args object.)
  const { data: claim, error: claimErr } = await (supabase as unknown as SupabaseClient).rpc(
    "claim_pro_trial_v2",
    { p_domain: domain }
  );
  if (claimErr || typeof claim !== "string") {
    console.error("[billing] claim_pro_trial_v2 failed", claimErr?.message);
    return NextResponse.json({ error: "Vérification impossible" }, { status: 502 });
  }
  if (claim !== "ok") {
    const known = RPC_ERRORS[claim];
    return NextResponse.json(
      known ?? { error: "Vérification impossible" },
      { status: known?.status ?? 502 }
    );
  }

  const { data: granted } = await supabase
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("user_id", user.id)
    .limit(1);
  const trialEndsAt =
    (granted?.[0] as Pick<SubscriptionRow, "trial_ends_at"> | undefined)?.trial_ends_at ?? null;

  return NextResponse.json({ ok: true, plan: "pro", trialEndsAt });
}
