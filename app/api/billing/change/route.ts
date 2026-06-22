import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  PLANS,
  priceCents,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";
import type { SubscriptionRow } from "@/types/database";

/**
 * POST /api/billing/change   body: { plan: "pro"|"scale", interval: "month"|"year" }
 * Upgrades/downgrades the user's EXISTING subscription in place (with proration)
 * — no cancel, no new checkout. Creates a price for the target plan and swaps
 * the subscription item to it, then updates our local plan record.
 */
async function stripe(path: string, body?: URLSearchParams) {
  return fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });
}

export async function POST(req: Request) {
  const { plan, interval } = (await req.json().catch(() => ({}))) as {
    plan?: string;
    interval?: string;
  };
  const def = plan && plan !== "free" ? PLANS[plan as PlanId] : undefined;
  if (!def || !env.stripeSecretKey) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const billingInterval: BillingInterval = interval === "year" ? "year" : "month";

  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase" }, { status: 400 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .limit(1);
  const subId = (
    data?.[0] as Pick<SubscriptionRow, "stripe_subscription_id"> | undefined
  )?.stripe_subscription_id;
  if (!subId) {
    return NextResponse.json(
      { error: "Aucun abonnement actif à modifier" },
      { status: 400 }
    );
  }

  try {
    // 1) Create a price for the target plan + interval (inline product).
    const priceBody = new URLSearchParams();
    priceBody.set("unit_amount", String(priceCents(def, billingInterval)));
    priceBody.set("currency", "eur");
    priceBody.set("recurring[interval]", billingInterval);
    priceBody.set("product_data[name]", `Nightflow ${def.name}`);
    const priceRes = await stripe("prices", priceBody);
    const price = (await priceRes.json()) as { id?: string; error?: { message?: string } };
    if (!priceRes.ok || !price.id) {
      return NextResponse.json(
        { error: price.error?.message ?? "Tarif introuvable" },
        { status: 502 }
      );
    }

    // 2) Find the current subscription item to swap.
    const subRes = await stripe(`subscriptions/${subId}`);
    const sub = (await subRes.json()) as {
      items?: { data?: { id?: string }[] };
      error?: { message?: string };
    };
    const itemId = sub.items?.data?.[0]?.id;
    if (!subRes.ok || !itemId) {
      return NextResponse.json(
        { error: sub.error?.message ?? "Abonnement introuvable" },
        { status: 502 }
      );
    }

    // 3) Swap the item to the new price (proration → only pay the difference).
    const upd = new URLSearchParams();
    upd.set("items[0][id]", itemId);
    upd.set("items[0][price]", price.id);
    upd.set("proration_behavior", "create_prorations");
    upd.set("metadata[plan]", def.id);
    const updRes = await stripe(`subscriptions/${subId}`, upd);
    if (!updRes.ok) {
      const e = (await updRes.json()) as { error?: { message?: string } };
      return NextResponse.json(
        { error: e.error?.message ?? "Changement impossible" },
        { status: 502 }
      );
    }

    // 4) Reflect the new plan locally.
    const db = supabase as unknown as SupabaseClient;
    await db
      .from("subscriptions")
      .update({ plan: def.id, billing_interval: billingInterval })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, plan: def.id });
  } catch {
    return NextResponse.json({ error: "Stripe injoignable" }, { status: 502 });
  }
}
