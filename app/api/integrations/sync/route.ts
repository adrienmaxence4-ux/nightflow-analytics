import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProviderSync } from "@/lib/integrations/sync-runner";
import { enqueueJob } from "@/lib/integrations/queue";

/**
 * GET/POST /api/integrations/sync
 * Hourly background sync worker (Vercel Cron). Iterates every connected
 * integration across all stores and re-syncs it with retry. Guarded by
 * CRON_SECRET (Vercel Cron sends it as a Bearer token). Session-less → uses the
 * service-role client.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  return !!env.cronSecret && req.headers.get("authorization") === `Bearer ${env.cronSecret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "service role not configured" }, { status: 503 });
  }
  const db = admin as unknown as SupabaseClient;

  const { data } = await admin
    .from("integrations")
    .select("store_id, provider")
    .eq("status", "connected");
  const rows = (data as { store_id: string; provider: string }[] | null) ?? [];

  let succeeded = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const res = await runProviderSync(db, r.store_id, r.provider);
      if (res.ok) succeeded++;
      else failed++;
    } catch (e) {
      failed++;
      console.error(`[sync] ${r.provider}/${r.store_id}`, e);
      // Queue a retry with backoff so a transient failure self-heals.
      await enqueueJob(db, {
        storeId: r.store_id,
        provider: r.provider,
        kind: "sync",
        runAfterMs: 60_000,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, processed: rows.length, succeeded, failed });
}

export const GET = handle;
export const POST = handle;
