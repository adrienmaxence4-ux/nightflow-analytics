import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionRow } from "@/types/database";

/**
 * POST /api/billing/portal
 * Opens the Stripe Customer Portal for the logged-in user — where they can
 * change their card, switch/cancel their plan, and see invoices. Returns the
 * portal URL. Requires an existing Stripe customer (i.e. a past checkout).
 */
export async function POST() {
  if (!env.stripeSecretKey) {
    return NextResponse.json({ error: "Facturation non configurée" }, { status: 400 });
  }
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase" }, { status: 400 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1);
  const customerId = (data?.[0] as Pick<SubscriptionRow, "stripe_customer_id"> | undefined)
    ?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "Aucun abonnement actif — choisis d'abord un plan." },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams();
    params.set("customer", customerId);
    params.set("return_url", `${env.siteUrl}/billing`);
    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(20_000),
    });
    const portal = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !portal.url) {
      const msg = portal.error?.message ?? "";
      // Test→live switch: the stored customer belongs to the OLD mode. Clean the
      // stale ids so the UI returns to the honest "no card on file" state.
      if (/no such customer/i.test(msg)) {
        const db = supabase as unknown as SupabaseClient;
        await db
          .from("subscriptions")
          .update({ stripe_customer_id: null, stripe_subscription_id: null })
          .eq("user_id", user.id);
        return NextResponse.json(
          {
            error:
              "Ton ancien abonnement datait du mode test — aucune carte réelle n'est enregistrée. Choisis un plan pour t'abonner en réel.",
          },
          { status: 409 }
        );
      }
      // Live portal not activated yet in the Stripe dashboard.
      if (/default configuration|no configuration/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Portail Stripe non activé en mode réel — active-le sur dashboard.stripe.com/settings/billing/portal.",
          },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: msg || "Portail indisponible (activez-le dans Stripe)" },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: "Stripe injoignable" }, { status: 502 });
  }
}
