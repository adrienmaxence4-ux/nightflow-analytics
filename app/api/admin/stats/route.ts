import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { PRODUCT_EVENTS, PRODUCT_EVENT_LABELS } from "@/lib/product-events";
import type { ProductEventRow, SubscriptionRow } from "@/types/database";

/**
 * GET /api/admin/stats — founder dashboard data, ADMIN ONLY.
 * Returns: daily unique visitors (30d), signups (total + 30d curve),
 * paying subscriptions by plan, and REAL revenue from Stripe (60d, daily).
 */
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Pays les plus probables pour une boutique francophone, + langue à employer. */
const PAYS: Record<string, string> = {
  FR: "France", BE: "Belgique", CH: "Suisse", CA: "Canada", LU: "Luxembourg",
  MC: "Monaco", MA: "Maroc", DZ: "Algérie", TN: "Tunisie", SN: "Sénégal",
  CI: "Côte d'Ivoire", US: "États-Unis", GB: "Royaume-Uni", IE: "Irlande",
  DE: "Allemagne", AT: "Autriche", ES: "Espagne", MX: "Mexique", PT: "Portugal",
  BR: "Brésil", IT: "Italie", NL: "Pays-Bas", PL: "Pologne", SE: "Suède",
  AU: "Australie", JP: "Japon", IN: "Inde",
};
const LANGUE: Record<string, string> = {
  FR: "Français", BE: "Français", CH: "Français", CA: "Français", LU: "Français",
  MC: "Français", MA: "Français", DZ: "Français", TN: "Français", SN: "Français",
  CI: "Français", ES: "Espagnol", MX: "Espagnol", DE: "Allemand", AT: "Allemand",
  PT: "Portugais", BR: "Portugais", IT: "Italien", NL: "Néerlandais",
};

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
    .select("date, country")
    .gte("date", day(since30));
  const visitRows = (visits as { date: string; country: string | null }[] | null) ?? [];
  const visitsByDay = new Map<string, number>();
  for (const v of visitRows) {
    visitsByDay.set(v.date, (visitsByDay.get(v.date) ?? 0) + 1);
  }

  // ── D'où viennent les visiteurs, pour choisir la langue des publications ──
  const parPays = new Map<string, number>();
  for (const v of visitRows) {
    if (v.country) parPays.set(v.country, (parPays.get(v.country) ?? 0) + 1);
  }
  const totalLocalise = [...parPays.values()].reduce((t, n) => t + n, 0);
  const pays = [...parPays.entries()]
    .map(([code, visiteurs]) => ({
      code,
      nom: PAYS[code] ?? code,
      langue: LANGUE[code] ?? "Anglais",
      visiteurs,
      part: totalLocalise ? Math.round((visiteurs / totalLocalise) * 100) : 0,
    }))
    .sort((a, b) => b.visiteurs - a.visiteurs)
    .slice(0, 12);

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

  // ── Funnel (product_events, 30d): distinct actors per step, in funnel
  //    order, plus D1/D7 return rates of the accounts that signed up. ──
  const { data: eventRows } = await admin
    .from("product_events")
    .select("name, vid, user_id, created_at")
    .gte("date", day(since30));
  const events =
    (eventRows as Pick<ProductEventRow, "name" | "vid" | "user_id" | "created_at">[] | null) ?? [];
  const actorsByStep = new Map<string, Set<string>>();
  for (const e of events) {
    const actor = e.user_id ?? e.vid;
    if (!actor) continue;
    if (!actorsByStep.has(e.name)) actorsByStep.set(e.name, new Set());
    actorsByStep.get(e.name)!.add(actor);
  }
  const funnel = PRODUCT_EVENTS.filter((n) => n !== "app_return").map((name) => ({
    name,
    label: PRODUCT_EVENT_LABELS[name],
    count: actorsByStep.get(name)?.size ?? 0,
  }));

  const signupAt = new Map<string, number>();
  for (const e of events) {
    if (e.name === "signup_done" && e.user_id) {
      const t = new Date(e.created_at).getTime();
      signupAt.set(e.user_id, Math.min(signupAt.get(e.user_id) ?? Infinity, t));
    }
  }
  const returns = new Map<string, number[]>();
  for (const e of events) {
    if (e.name === "app_return" && e.user_id && signupAt.has(e.user_id)) {
      const days = (new Date(e.created_at).getTime() - signupAt.get(e.user_id)!) / DAY_MS;
      returns.set(e.user_id, [...(returns.get(e.user_id) ?? []), days]);
    }
  }
  const rate = (minDays: number) => {
    const eligible = [...signupAt.entries()].filter(
      ([, t]) => Date.now() - t >= minDays * DAY_MS
    );
    if (eligible.length === 0) return null;
    const kept = eligible.filter(([id]) => (returns.get(id) ?? []).some((d) => d >= minDays));
    return Math.round((kept.length / eligible.length) * 100);
  };
  const retention = { signups: signupAt.size, d1: rate(1), d7: rate(7) };

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
    pays,
    funnel,
    retention,
  });
}
