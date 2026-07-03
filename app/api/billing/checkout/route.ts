import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import {
  PLANS,
  priceCents,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";

/**
 * POST /api/billing/checkout   body: { plan: "pro"|"scale", interval: "month"|"year" }
 * Creates a Stripe Checkout Session (recurring subscription) on the platform
 * account and returns its hosted URL. The customer pays on Stripe's secure page
 * — we never touch card data. Inline price_data → no Stripe product setup needed.
 */
export async function POST(req: Request) {
  const { plan, interval } = (await req.json().catch(() => ({}))) as {
    plan?: string;
    interval?: string;
  };
  const def = plan && plan !== "free" ? PLANS[plan as PlanId] : undefined;
  if (!def) {
    return NextResponse.json({ error: "Plan inconnu" }, { status: 400 });
  }
  const billingInterval: BillingInterval = interval === "year" ? "year" : "month";
  const amountCents = priceCents(def, billingInterval);

  if (!env.stripeSecretKey) {
    return NextResponse.json(
      { error: "Facturation non configurée (clé Stripe manquante)" },
      { status: 400 }
    );
  }

  // Authentication REQUIRED: every session must be tied to its owner —
  // ownerless sessions can't be verified by /confirm and invite abuse.
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 400 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!rateLimit(`checkout:${user.id}`, 5, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }
  const email = user.email ?? undefined;
  const userId = user.id;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set(
    "success_url",
    `${env.siteUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`
  );
  params.set("cancel_url", `${env.siteUrl}/billing?checkout=cancel`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "eur");
  params.set("line_items[0][price_data][unit_amount]", String(amountCents));
  params.set("line_items[0][price_data][recurring][interval]", billingInterval);
  params.set(
    "line_items[0][price_data][product_data][name]",
    `Nightflow ${def.name}`
  );
  params.set("allow_promotion_codes", "true");
  // Link the subscription back to the user + plan for the webhook.
  if (userId) {
    params.set("client_reference_id", userId);
    params.set("subscription_data[metadata][user_id]", userId);
    params.set("subscription_data[metadata][plan]", def.id);
  }
  if (email) params.set("customer_email", email);

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !data.url) {
      console.error("[billing] checkout failed", data.error);
      return NextResponse.json(
        { error: data.error?.message ?? "Création du paiement impossible" },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: data.url });
  } catch (e) {
    console.error("[billing] checkout error", e);
    return NextResponse.json({ error: "Stripe injoignable" }, { status: 502 });
  }
}
