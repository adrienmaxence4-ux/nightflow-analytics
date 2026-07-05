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

export async function POST(req: Request) {
  const { vid } = (await req.json().catch(() => ({}))) as { vid?: string };
  if (!vid || !VID_RE.test(vid)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Light abuse guard (per instance) — one vid can't spam inserts.
  if (!rateLimit(`track:${vid}`, 5, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true }); // engine offline → no-op

  const db = admin as unknown as SupabaseClient;
  await db
    .from("site_visits")
    .upsert(
      { date: new Date().toISOString().slice(0, 10), vid },
      { onConflict: "date,vid", ignoreDuplicates: true }
    );
  return NextResponse.json({ ok: true });
}
