import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { secureEquals } from "@/lib/secure-compare";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildStoreContextForStore } from "@/services/ai/store-context";
import { answerCopilotQuestion } from "@/services/ai/copilot";
import { resolveAiAction } from "@/services/actions/suggest";
import type { ProductRow } from "@/types/database";

/**
 * POST /api/automation/reel-inspiration
 *
 * Lets Adrien's own scheduled routine (the daily "Auto-Growth" cloud agent)
 * ask the real, production Copilot which Reel to take inspiration from — the
 * exact same reasoning a human sees in the chat, grounded in real posts and
 * real tracking-code visits, not the routine's own guess from raw exports.
 *
 * There is no browser session here, so this cannot reuse the normal
 * /api/copilot auth path (which is correctly locked to a real login — see the
 * DoS fix from earlier tonight). It reuses CRON_SECRET instead: the same
 * trust tier already gating voice-summary, jobs/process and integrations/sync,
 * so nothing new has to be created in Vercel for this to work. Never
 * customer-reachable — there is exactly one store this can ever resolve to.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_QUESTION =
  "Sur quel Reel dois-je m'inspirer pour la suite de mes Reels, et pourquoi celui-là précisément ?";

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  return !!env.cronSecret && secureEquals(header, `Bearer ${env.cronSecret}`);
}

/** The store owned by the first configured admin email — see lib/admin.ts. */
async function resolveAdminStoreId(
  admin: SupabaseClient
): Promise<string | null> {
  for (const email of env.adminEmails) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    const ownerId = (profile as { id?: string } | null)?.id;
    if (!ownerId) continue;
    const { data: store } = await admin
      .from("stores")
      .select("id")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle();
    const storeId = (store as { id?: string } | null)?.id;
    if (storeId) return storeId;
  }
  return null;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { question } = (await req.json().catch(() => ({}))) as {
    question?: string;
  };
  const q =
    typeof question === "string" && question.trim()
      ? question.trim().slice(0, 500)
      : DEFAULT_QUESTION;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "service role not configured" }, { status: 503 });
  }
  const db = admin as unknown as SupabaseClient;

  const storeId = await resolveAdminStoreId(db);
  if (!storeId) {
    return NextResponse.json({ error: "no store found for admin account" }, { status: 404 });
  }

  const ctx = await buildStoreContextForStore(db, storeId);
  if (!ctx) {
    return NextResponse.json({ error: "store has no data yet" }, { status: 404 });
  }

  const { answer, source, hint } = await answerCopilotQuestion(q, ctx);

  let action = null;
  if (hint) {
    const { data } = await db.from("products").select("*").eq("store_id", storeId);
    action = resolveAiAction(hint, (data as ProductRow[] | null) ?? []);
  }

  return NextResponse.json({ question: q, answer, source, action });
}
