import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import type { SubscriptionRow, VipCodeRow } from "@/types/database";

/**
 * POST /api/vip/redeem   body: { code }
 * Redeems a VIP invitation code for the LOGGED-IN user: activates the offered
 * plan (Scale) if the code is valid and not exhausted. Never downgrades or
 * touches a real paid subscription.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!rateLimit(`vip:${user.id}`, 5, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const key = code?.trim().toUpperCase();
  if (!key || !/^[A-Z0-9_-]{3,32}$/.test(key)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  const db = admin as unknown as SupabaseClient;

  const { data: codes } = await db.from("vip_codes").select("*").eq("code", key).limit(1);
  const vip = (codes?.[0] as VipCodeRow | undefined) ?? null;
  if (!vip) return NextResponse.json({ error: "Code inconnu" }, { status: 404 });
  if (vip.uses >= vip.max_uses) {
    return NextResponse.json({ error: "Code épuisé" }, { status: 410 });
  }

  // Never clobber a REAL paid subscription (Stripe-backed).
  const { data: subs } = await db
    .from("subscriptions")
    .select("plan, stripe_subscription_id")
    .eq("user_id", user.id)
    .limit(1);
  const existing = subs?.[0] as
    | Pick<SubscriptionRow, "plan" | "stripe_subscription_id">
    | undefined;
  if (existing?.stripe_subscription_id) {
    return NextResponse.json({ ok: true, plan: existing.plan, applied: false });
  }
  if (existing?.plan === vip.plan) {
    return NextResponse.json({ ok: true, plan: vip.plan, applied: false });
  }

  await db.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan: vip.plan,
      billing_interval: "month",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
    },
    { onConflict: "user_id" }
  );
  await db.from("vip_codes").update({ uses: vip.uses + 1 }).eq("code", key);

  return NextResponse.json({ ok: true, plan: vip.plan, applied: true });
}
