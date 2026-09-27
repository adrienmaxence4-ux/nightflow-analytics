import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isProductEvent, type ProductEventName } from "@/lib/product-events";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/track/event   body: { name, vid, props? }
 * One funnel step. Same privacy rules as /api/track: a random LOCAL visitor
 * id, the signed-in user id when there is a session, no IP, no PII. Writes via
 * the service role because anonymous visitors have no session; the table has
 * no public policy — so what this route accepts is the whole contract.
 */
export const dynamic = "force-dynamic";

const VID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_RE = /^[a-z][a-z0-9_]{1,23}$/;
const RETENTION_DAYS = 90;

/** Steps a visitor reaches before having a session. Every later step needs one. */
const ANONYMOUS_STEPS: ReadonlySet<ProductEventName> = new Set([
  "landing_view",
  "cta_click",
  "signup_start",
  "signup_done",
]);

/**
 * The only props each step may carry, validated by value: free text would let
 * a script store an email under a harmless-looking key.
 */
function cleanProps(name: ProductEventName, raw: unknown): Record<string, string | boolean> {
  const p = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  switch (name) {
    case "cta_click":
      return p.where === "nav" || p.where === "page" ? { where: p.where } : {};
    case "signup_done":
      return typeof p.confirm === "boolean" ? { confirm: p.confirm } : {};
    case "integration_connected":
      return typeof p.provider === "string" && PROVIDER_RE.test(p.provider) ? { provider: p.provider } : {};
    default:
      return {};
  }
}

export async function POST(req: Request) {
  const { name, vid, props } = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    vid?: unknown;
    props?: unknown;
  };
  if (!isProductEvent(name)) return NextResponse.json({ ok: false }, { status: 400 });
  const visitor = typeof vid === "string" && VID_RE.test(vid) ? vid : null;

  // Global guard first: random vids must not mint unlimited per-actor keys.
  if (!rateLimit("event:global", 120, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  // Session is optional only for the anonymous half of the funnel.
  const supabase = createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user && !ANONYMOUS_STEPS.has(name)) return NextResponse.json({ ok: false }, { status: 401 });
  const actor = user?.id ?? visitor;
  if (!actor) return NextResponse.json({ ok: false }, { status: 400 });

  if (!rateLimit(`event:${actor}`, 30, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true }); // engine offline → no-op

  const db = admin as unknown as SupabaseClient;
  const today = new Date().toISOString().slice(0, 10);
  // One row per actor, step and day: the funnel counts distinct actors, so a
  // repeat adds nothing but rows.
  await db
    .from("product_events")
    .upsert(
      { date: today, name, actor, vid: visitor, user_id: user?.id ?? null, props: cleanProps(name, props) },
      { onConflict: "date,name,actor", ignoreDuplicates: true }
    )
    .then(() => undefined, () => undefined); // a missing table must not 500 the page

  // Retention without a scheduler: about one request in a hundred trims rows
  // older than the admin view ever reads.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
    await db
      .from("product_events")
      .delete()
      .lt("date", cutoff)
      .then(() => undefined, () => undefined);
  }

  return NextResponse.json({ ok: true });
}
