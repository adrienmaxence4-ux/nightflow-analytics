import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import type { SubscriptionRow } from "@/types/database";

/**
 * POST /api/billing/trial
 * Starts the ONE free 30-day Pro trial — no card, no Stripe. Access is granted
 * purely in our DB (status='trialing'), and the AI/gating layer already treats
 * "trialing" as an active Pro plan.
 *
 * Anti-abuse: `claim_pro_trial()` is a SECURITY DEFINER RPC that records the
 * caller's NORMALIZED email (gmail dots/+aliases neutralised) in a ledger and
 * returns false if that identity already used its trial — so re-creating an
 * alias account can't unlock a second trial. We also refuse users who ever had
 * a paid subscription.
 */
const TRIAL_DAYS = 30;

export async function POST() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase" }, { status: 400 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!rateLimit(`trial:${user.id}`, 5, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  // Guard 1 — already on a paid/trial plan, or has ever paid (Stripe customer).
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1);
  const row = data?.[0] as
    | Pick<SubscriptionRow, "plan" | "status" | "stripe_customer_id">
    | undefined;
  if (row) {
    if (row.status === "active" || row.status === "trialing") {
      return NextResponse.json(
        { error: "Tu as déjà un abonnement ou un essai actif." },
        { status: 409 }
      );
    }
    if (row.stripe_customer_id) {
      return NextResponse.json(
        { error: "L'essai gratuit est réservé aux comptes qui n'ont jamais été abonnés." },
        { status: 409 }
      );
    }
  }

  // Guard 2 — the identity ledger (blocks new-account / alias re-trials).
  const { data: claimed, error: claimErr } = await supabase.rpc("claim_pro_trial");
  if (claimErr) {
    return NextResponse.json({ error: "Vérification impossible" }, { status: 502 });
  }
  if (!claimed) {
    return NextResponse.json(
      { error: "Essai gratuit déjà utilisé sur cette adresse email." },
      { status: 409 }
    );
  }

  // Grant the 30-day Pro trial.
  const now = Date.now();
  const endsAt = new Date(now + TRIAL_DAYS * 86_400_000).toISOString();
  const db = supabase as unknown as SupabaseClient;
  const { error: upErr } = await db.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan: "pro",
      billing_interval: "month",
      status: "trialing",
      trial_ends_at: endsAt,
      current_period_end: endsAt,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    },
    { onConflict: "user_id" }
  );
  if (upErr) {
    console.error("[billing] trial grant failed", upErr);
    return NextResponse.json({ error: "Activation impossible" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan: "pro", trialEndsAt: endsAt });
}
