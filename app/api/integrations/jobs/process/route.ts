import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimDueJobs,
  completeJob,
  enqueueEvents,
  failJob,
} from "@/lib/integrations/queue";
import { runProviderSync } from "@/lib/integrations/sync-runner";
import { getConnector } from "@/services/integrations/engine/connectors";

/**
 * GET/POST /api/integrations/jobs/process
 * Retry worker (Vercel Cron, every ~10 min). Claims due jobs from the DB queue
 * and re-runs them: failed webhooks are re-normalized + persisted; failed syncs
 * are retried. Exhausted jobs (max attempts) are marked failed. Guarded by
 * CRON_SECRET; session-less → service-role client.
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

  const jobs = await claimDueJobs(db, 25);
  let done = 0;
  let retried = 0;

  for (const job of jobs) {
    try {
      if (job.kind === "sync") {
        await runProviderSync(db, job.store_id, job.provider);
      } else if (job.kind === "webhook") {
        const connector = getConnector(job.provider);
        const body = (job.payload as { body?: string }).body;
        if (connector && body) {
          const events = connector.normalizeWebhook(JSON.parse(body), job.store_id);
          await enqueueEvents(db, events);
        }
      }
      await completeJob(db, job.id);
      done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await failJob(db, job, msg);
      retried++;
    }
  }

  return NextResponse.json({ ok: true, claimed: jobs.length, done, retried });
}

export const GET = handle;
export const POST = handle;
