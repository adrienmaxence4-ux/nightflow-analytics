import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/track   body: { vid }
 * Privacy-first visit counter: one random LOCAL id (localStorage) + today's
 * date, deduped by the primary key — no cookies, no IP stored, no PII.
 * Writes via the service role (anonymous visitors have no session).
 */
export const dynamic = "force-dynamic";

const VID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AD_RE = /^[A-Za-z0-9_-]{2,32}$/;

export async function POST(req: Request) {
  const { vid, forget, ad } = (await req.json().catch(() => ({}))) as {
    vid?: string;
    forget?: boolean;
    ad?: string;
  };
  if (!vid || !VID_RE.test(vid)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // "forget" — the admin's browser purges its own past visits from the stats.
  if (forget) {
    const admin = createAdminClient();
    if (admin) {
      await (admin as unknown as SupabaseClient)
        .from("site_visits")
        .delete()
        .eq("vid", vid);
    }
    return NextResponse.json({ ok: true, forgotten: true });
  }
  // Light abuse guard (per instance) — one vid can't spam inserts.
  if (!rateLimit(`track:${vid}`, 5, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true }); // engine offline → no-op

  const db = admin as unknown as SupabaseClient;
  const today = new Date().toISOString().slice(0, 10);
  // Pays seulement — l'en-tête est calculé par Vercel à partir de l'IP, que
  // nous ne lisons ni ne stockons (donnée personnelle au sens du RGPD).
  const brut = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(brut) ? brut : null;
  await db
    .from("site_visits")
    .upsert(
      { date: today, vid, country },
      { onConflict: "date,vid", ignoreDuplicates: true }
    );

  // Ad attribution — which published ad sent this visitor (no PII, deduped).
  if (ad && AD_RE.test(ad)) {
    await db
      .from("ad_visits")
      .upsert(
        { date: today, code: ad, vid },
        { onConflict: "date,code,vid", ignoreDuplicates: true }
      );
  }
  return NextResponse.json({ ok: true });
}
