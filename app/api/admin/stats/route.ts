import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import type { SubscriptionRow } from "@/types/database";

/**
 * GET /api/admin/stats — founder dashboard data, ADMIN ONLY.
 * Returns: daily unique visitors (30d), signups (total + 30d curve),
 * paying subscriptions by plan, and REAL revenue from Stripe (60d, daily).
 */
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const day = (d: Date) => d.toISOString().slice(0, 10);

export async function GET() {
  // Gate: logged-in admin only (session client), data via service role.
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquante" },
      { status: 503 }
    );
  }

  const since30 = new Date(Date.now() - 30 * DAY_MS);

  // ── Visitors (site_visits, unique per day) ──
  const { data: visits } = await admin
    .from("site_visits")
    .select("date")
    .gte("date", day(since30));
  const visitsByDay = new Map<string, number>();
  for (const v of (visits as { date: string }[] | null) ?? []) {
    visitsByDay.set(v.date, (visitsByDay.get(v.date) ?? 0) + 1);
  }

  // ── Signups (auth users) ──
  let usersTotal = 0;
  const signupsByDay = new Map<string, number>();
  try {
    const { data: usersPage } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    usersTotal = usersPage?.users?.length ?? 0;
    for (const u of usersPage?.users ?? []) {
      const d = (u.created_at ?? "").slice(0, 10);
      if (d && new Date(d) >= since30) {
        signupsByDay.set(d, (signupsByDay.get(d) ?? 0) + 1);
      }
    }
  } catch {
    /* auth admin unavailable — leave zeros */
  }

  // ── Paying subscriptions by plan ──
  const { data: subs } = await admin
    .from("subscriptions")
    .select("plan, status");
  const subRows = (subs as Pick<SubscriptionRow, "plan" | "status">[] | null) ?? [];
  const active = subRows.filter((s) => ["active", "trialing"].includes(s.status));
  const subsByPlan = {
    pro: active.filter((s) => s.plan === "pro").length,
    scale: active.filter((s) => s.plan === "scale").length,
  };

  // ── Real revenue from Stripe (60d of succeeded charges) ──
  const revenueByDay = new Map<string, number>();
  let revenueTotalCents = 0;
  if (env.stripeSecretKey) {
    try {
      const sinceSec = Math.floor((Date.now() - 60 * DAY_MS) / 1000);
      let startingAfter: string | undefined;
      for (let page = 0; page < 5; page++) {
        const params = new URLSearchParams({ limit: "100" });
        params.append("created[gte]", String(sinceSec));
        if (startingAfter) params.append("starting_after", startingAfter);
        const res = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
          headers: { Authorization: `Bearer ${env.stripeSecretKey}` },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) break;
        const data = (await res.json()) as {
          data: { id: string; amount: number; created: number; paid: boolean; status: string; refunded?: boolean }[];
          has_more: boolean;
        };
        for (const c of data.data) {
          if (c.status !== "succeeded" || !c.paid || c.refunded) continue;
          const d = day(new Date(c.created * 1000));
          revenueByDay.set(d, (revenueByDay.get(d) ?? 0) + c.amount);
          revenueTotalCents += c.amount;
        }
        if (!data.has_more || data.data.length === 0) break;
        startingAfter = data.data[data.data.length - 1].id;
      }
    } catch {
      /* Stripe unreachable — leave zeros */
    }
  }

  // ── Assemble continuous 30-day series (oldest → newest) ──
  const series: {
    date: string;
    label: string;
    visiteurs: number;
    inscrits: number;
    revenus: number;
  }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = day(d);
    series.push({
      date: key,
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      visiteurs: visitsByDay.get(key) ?? 0,
      inscrits: signupsByDay.get(key) ?? 0,
      revenus: Math.round((revenueByDay.get(key) ?? 0) / 100),
    });
  }

  // ── Which ad works: visitors per published ad code (30d) ──
  const { data: adRows } = await admin
    .from("ad_visits")
    .select("code")
    .gte("date", day(since30));
  const byCode = new Map<string, number>();
  for (const r of (adRows as { code: string }[] | null) ?? []) {
    byCode.set(r.code, (byCode.get(r.code) ?? 0) + 1);
  }
  const adPerformance = [...byCode.entries()]
    .map(([code, visits]) => ({ code, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  const visitors30 = [...visitsByDay.values()].reduce((t, n) => t + n, 0);
  // Monthly recurring revenue estimate from active plans (cents).
  const mrrCents = subsByPlan.pro * 900 + subsByPlan.scale * 1900;

  return NextResponse.json({
    totals: {
      visitors30,
      usersTotal,
      payingSubs: subsByPlan.pro + subsByPlan.scale,
      revenueTotalCents,
      mrrCents,
    },
    subsByPlan,
    series,
    adPerformance,
  });
}
