import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { secureEquals } from "@/lib/secure-compare";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProviderSync } from "@/lib/integrations/sync-runner";
import { enqueueJob } from "@/lib/integrations/queue";
import { PermanentError } from "@/lib/integrations/retry";

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
  const header = req.headers.get("authorization") ?? "";
  return !!env.cronSecret && secureEquals(header, `Bearer ${env.cronSecret}`);
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

  // "error" is a state the hourly run must revisit, not a verdict: an outage
  // longer than the retry queue (~13 h) would otherwise park a row there for
  // good, and an Instagram token parked at "error" is never refreshed again.
  // Only "disconnected" (the merchant's choice) and "expired" (needs a
  // reconnect, nothing to retry) stay out.
  //
  // A row can also be stuck on "syncing": Vercel kills the invocation when
  // `maxDuration` runs out mid-sync and no catch ever writes a status. Left
  // alone it would never be synced or refreshed again, so anything still
  // "syncing" after 30 minutes (no run takes that long) is picked up too.
  const staleSyncing = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data } = await admin
    .from("integrations")
    .select("store_id, provider, status, updated_at")
    .in("status", ["connected", "error", "syncing"]);
  const rows = (
    (data as
      | { store_id: string; provider: string; status: string; updated_at: string }[]
      | null) ?? []
  ).filter((r) => r.status !== "syncing" || r.updated_at < staleSyncing);

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
      // A revoked token or a missing scope will not heal by itself; queuing
      // it only makes the card blink between "syncing" and "error" for 13 h.
      // A row that was already on "error" gets the hourly pass and nothing
      // more: a Shopify store that uninstalled the app would otherwise grow a
      // fresh chain of retry jobs every hour, forever.
      if (e instanceof PermanentError || r.status === "error") continue;
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
