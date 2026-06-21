import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/billing/checkout   body: { plan: "pro" | "scale" }
 * Creates a Stripe Checkout Session (subscription) on the platform account and
 * returns its hosted URL. The customer pays on Stripe's secure page — we never
 * touch card data. Uses inline price_data so no Stripe product setup is needed.
 */
const PLANS: Record<string, { name: string; amountCents: number }> = {
  pro: { name: "Nightflow Pro", amountCents: 4900 },
  scale: { name: "Nightflow Scale", amountCents: 14900 },
};

export async function POST(req: Request) {
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  const def = plan ? PLANS[plan] : undefined;
  if (!def) {
    return NextResponse.json({ error: "Plan inconnu" }, { status: 400 });
  }
  if (!env.stripeSecretKey) {
    return NextResponse.json(
      { error: "Facturation non configurée (clé Stripe manquante)" },
      { status: 400 }
    );
  }

  // Best-effort: prefill the customer's email.
  let email: string | undefined;
  const supabase = createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? undefined;
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${env.siteUrl}/billing?checkout=success&plan=${plan}`);
  params.set("cancel_url", `${env.siteUrl}/billing?checkout=cancel`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "eur");
  params.set("line_items[0][price_data][unit_amount]", String(def.amountCents));
  params.set("line_items[0][price_data][recurring][interval]", "month");
  params.set("line_items[0][price_data][product_data][name]", def.name);
  params.set("allow_promotion_codes", "true");
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
