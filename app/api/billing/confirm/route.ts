import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/plans";

/**
 * POST /api/billing/confirm   body: { sessionId }
 * After a successful Stripe Checkout, we retrieve the session FROM Stripe
 * (server-side, with the secret key — so it can't be spoofed), verify it
 * belongs to this user, and record the active subscription/plan in our DB.
 */
export async function POST(req: Request) {
  const { sessionId } = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
  };
  if (!sessionId || !env.stripeSecretKey) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase" }, { status: 400 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Retrieve the session (+ expanded subscription) from Stripe.
  let session: {
    client_reference_id?: string;
    customer?: string;
    subscription?: {
      id?: string;
      status?: string;
      current_period_end?: number;
      metadata?: { plan?: string; user_id?: string };
      items?: { data?: { price?: { recurring?: { interval?: string } } }[] };
    };
  };
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
      {
        headers: { Authorization: `Bearer ${env.stripeSecretKey}` },
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    session = await res.json();
  } catch {
    return NextResponse.json({ error: "Stripe injoignable" }, { status: 502 });
  }

  // Ownership check — the session must have been started by this user.
  const owner = session.client_reference_id ?? session.subscription?.metadata?.user_id;
  if (owner && owner !== user.id) {
    return NextResponse.json({ error: "Session non autorisée" }, { status: 403 });
  }

  const sub = session.subscription;
  const planId = (sub?.metadata?.plan as PlanId) ?? "pro";
  const plan = PLANS[planId] ? planId : "pro";
  const interval =
    sub?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month";
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const db = supabase as unknown as SupabaseClient;
  await db.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan,
      billing_interval: interval,
      status: sub?.status ?? "active",
      stripe_customer_id: session.customer ?? null,
      stripe_subscription_id: sub?.id ?? null,
      current_period_end: periodEnd,
    },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true, plan });
}
