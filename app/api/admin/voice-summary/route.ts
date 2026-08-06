import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";
import type { SubscriptionRow } from "@/types/database";

/**
 * GET /api/admin/voice-summary
 * Spoken activity summary for the desktop assistant (Jarvis), which has no user
 * session. Guarded by CRON_SECRET as a Bearer token — same contract as the cron
 * workers — so it may use the service-role client.
 *
 * Returns `text`, a ready-to-speak French sentence, plus the raw counters.
 */
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function authorized(req: Request): boolean {
  return (
    !!env.cronSecret &&
    req.headers.get("authorization") === `Bearer ${env.cronSecret}`
  );
}

/** "3 visiteurs" / "1 visiteur" — French agreement, spoken aloud. */
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n > 1 ? many : one}`;

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "engine offline" }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const since7 = new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10);

  // ── Visiteurs : aujourd'hui + 7 jours ──
  const { data: visits } = await admin
    .from("site_visits")
    .select("date")
    .gte("date", since7);
  const rows = (visits as { date: string }[] | null) ?? [];
  const visitorsToday = rows.filter((v) => v.date === today).length;
  const visitors7 = rows.length;

  // ── Abonnements actifs par plan ──
  const { data: subs } = await admin.from("subscriptions").select("plan, status");
  const subRows = (subs as Pick<SubscriptionRow, "plan" | "status">[] | null) ?? [];
  const active = subRows.filter((s) => ["active", "trialing"].includes(s.status));
  const pro = active.filter((s) => s.plan === "pro").length;
  const scale = active.filter((s) => s.plan === "scale").length;
  const mrrCents = pro * PLANS.pro.monthlyCents + scale * PLANS.scale.monthlyCents;

  // ── Phrase parlée ──
  const parts: string[] = [];
  parts.push(
    visitorsToday > 0
      ? `${plural(visitorsToday, "visiteur")} aujourd'hui, ${visitors7} sur sept jours.`
      : `Aucun visiteur aujourd'hui, ${visitors7} sur sept jours.`
  );
  if (pro + scale === 0) {
    parts.push("Aucun abonnement pour le moment.");
  } else {
    const detail: string[] = [];
    if (pro > 0) detail.push(plural(pro, "abonnement Pro"));
    if (scale > 0) detail.push(plural(scale, "abonnement Scale"));
    parts.push(
      `${detail.join(" et ")}, soit ${Math.round(mrrCents / 100)} euros par mois.`
    );
  }

  return NextResponse.json({
    text: parts.join(" "),
    visitorsToday,
    visitors7,
    subscriptions: { pro, scale },
    mrrCents,
  });
}
