import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

/**
 * POST /api/admin/grant   body: { email, plan? }  — ADMIN ONLY.
 * Offers a plan (default Scale) to someone: applied instantly if the account
 * exists, otherwise stored in vip_grants and auto-applied at signup (trigger).
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const { email, plan } = (await req.json().catch(() => ({}))) as {
    email?: string;
    plan?: string;
  };
  const target = email?.trim().toLowerCase();
  const grantPlan = plan === "pro" ? "pro" : "scale";
  if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role manquant" }, { status: 503 });
  }
  const db = admin as unknown as SupabaseClient;

  // Remember the grant for future signups (idempotent).
  await db.from("vip_grants").upsert(
    { email: target, plan: grantPlan, note: "offert via /admin" },
    { onConflict: "email" }
  );

  // If the account already exists, apply it right now.
  try {
    const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = page?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === target
    );
    if (existing) {
      await db.from("subscriptions").upsert(
        {
          user_id: existing.id,
          plan: grantPlan,
          billing_interval: "month",
          status: "active",
          stripe_customer_id: null,
          stripe_subscription_id: null,
        },
        { onConflict: "user_id" }
      );
      return NextResponse.json({ ok: true, applied: "now", plan: grantPlan });
    }
  } catch {
    /* listUsers unavailable — the signup trigger will still apply it */
  }

  return NextResponse.json({ ok: true, applied: "on_signup", plan: grantPlan });
}
