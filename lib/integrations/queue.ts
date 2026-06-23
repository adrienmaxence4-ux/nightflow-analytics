import type { SupabaseClient } from "@supabase/supabase-js";
import { nextRetryDelayMs } from "@/lib/integrations/retry";
import { assertPiiFree } from "@/services/integrations/engine/normalize";
import type { NormalizedEvent } from "@/services/integrations/engine/types";
import type { IntegrationJobRow } from "@/types/database";

/**
 * SERVER-ONLY. DB-backed event store + job queue — the Vercel + Supabase
 * "equivalent" of Redis/BullMQ. Always called with the service-role admin
 * client (webhooks + cron), since these contexts have no user session.
 */

function dedupeKey(e: NormalizedEvent): string {
  const id =
    e.metadata.external_id ??
    e.metadata.campaign_id ??
    e.metadata.product_id ??
    String(e.timestamp);
  return `${e.source}:${e.event_type}:${id}`;
}

/** Persists normalized events (PII-stripped, deduped on store+dedupe_key). */
export async function enqueueEvents(
  admin: SupabaseClient,
  events: NormalizedEvent[]
): Promise<number> {
  if (events.length === 0) return 0;
  const rows = events.map((raw) => {
    const e = assertPiiFree(raw);
    return {
      store_id: e.shop_id,
      source: e.source,
      event_type: e.event_type,
      occurred_at: new Date(e.timestamp).toISOString(),
      metrics: e.metrics,
      metadata: e.metadata,
      dedupe_key: dedupeKey(e),
    };
  });
  const { error } = await admin
    .from("integration_events")
    .upsert(rows, { onConflict: "store_id,dedupe_key", ignoreDuplicates: true });
  if (error) {
    console.error("[queue] enqueueEvents", error.message);
    return 0;
  }
  return rows.length;
}

export interface EnqueueJobInput {
  storeId: string;
  provider: string;
  kind: "webhook" | "sync";
  payload?: Record<string, unknown>;
  runAfterMs?: number;
}

export async function enqueueJob(
  admin: SupabaseClient,
  input: EnqueueJobInput
): Promise<void> {
  await admin.from("integration_jobs").insert({
    store_id: input.storeId,
    provider: input.provider,
    kind: input.kind,
    payload: input.payload ?? {},
    run_after: new Date(Date.now() + (input.runAfterMs ?? 0)).toISOString(),
  });
}

/** Claims up to `limit` due jobs and marks them processing. */
export async function claimDueJobs(
  admin: SupabaseClient,
  limit = 20
): Promise<IntegrationJobRow[]> {
  const { data } = await admin
    .from("integration_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("run_after", { ascending: true })
    .limit(limit);
  const jobs = (data as IntegrationJobRow[] | null) ?? [];
  if (jobs.length) {
    await admin
      .from("integration_jobs")
      .update({ status: "processing" })
      .in(
        "id",
        jobs.map((j) => j.id)
      );
  }
  return jobs;
}

export async function completeJob(
  admin: SupabaseClient,
  id: string
): Promise<void> {
  await admin.from("integration_jobs").update({ status: "done" }).eq("id", id);
}

/** Schedules a retry with exponential backoff, or marks failed when exhausted. */
export async function failJob(
  admin: SupabaseClient,
  job: IntegrationJobRow,
  error: string
): Promise<void> {
  const attempts = job.attempts + 1;
  const exhausted = attempts >= job.max_attempts;
  await admin
    .from("integration_jobs")
    .update({
      status: exhausted ? "failed" : "pending",
      attempts,
      last_error: error.slice(0, 500),
      run_after: new Date(Date.now() + nextRetryDelayMs(job.attempts)).toISOString(),
    })
    .eq("id", job.id);
}
