import type { SupabaseClient } from "@supabase/supabase-js";
import { retryUnlessPermanent, withRetry } from "@/lib/integrations/retry";
import {
  getStoredTokens,
  isExpired,
  markSynced,
  saveTokens,
  setStatus,
} from "@/lib/integrations/tokens";
import { getConnector } from "@/services/integrations/engine/connectors";
import type { SyncResult } from "@/services/integrations/engine/types";

/**
 * SERVER-ONLY. Runs one provider's sync for one store, end-to-end:
 * load + (if needed) refresh tokens → mark syncing → connector.sync with retry
 * → update lifecycle status. Used by the hourly cron and the retry worker.
 * `admin` must be the service-role client (RLS bypassed, no user session).
 */
export async function runProviderSync(
  admin: SupabaseClient,
  storeId: string,
  provider: string
): Promise<SyncResult> {
  const connector = getConnector(provider);
  if (!connector) {
    return { source: "shopify", events: 0, ok: false, error: "unknown provider" };
  }

  let tokens = await getStoredTokens(admin, storeId, provider);
  if (!tokens) {
    // A retry job queued before the merchant disconnected must not paint an
    // "Erreur" on an integration they deliberately removed.
    const { data } = await admin
      .from("integrations")
      .select("status")
      .eq("store_id", storeId)
      .eq("provider", provider)
      .limit(1);
    const status = (data?.[0] as { status?: string } | undefined)?.status;
    if (status !== "disconnected") {
      await setStatus(admin, storeId, provider, "error", "no stored token");
    }
    return { source: connector.source, events: 0, ok: false, error: "no token" };
  }

  // Token expiration detection + automatic refresh. A refresh that THROWS
  // (platform unreachable) propagates before any status is written, so the
  // cron queues a retry instead of this run declaring the grant dead.
  if (isExpired(tokens, connector.refreshMarginMs)) {
    const refreshed = await connector.refresh(tokens);
    if (refreshed) {
      await saveTokens(admin, storeId, provider, refreshed);
      tokens = await getStoredTokens(admin, storeId, provider);
    } else {
      // The /social page may have refreshed the same grant a second ago (its
      // own refresh path writes new tokens): re-read before declaring it dead,
      // otherwise "expired" overwrites a row whose tokens are perfectly valid.
      const latest = await getStoredTokens(admin, storeId, provider);
      if (latest && !isExpired(latest, connector.refreshMarginMs)) {
        tokens = latest;
      } else {
        await setStatus(admin, storeId, provider, "expired", "token expired");
        return { source: connector.source, events: 0, ok: false, error: "expired" };
      }
    }
  }
  if (!tokens) {
    await setStatus(admin, storeId, provider, "error", "token unavailable");
    return { source: connector.source, events: 0, ok: false, error: "no token" };
  }

  await setStatus(admin, storeId, provider, "syncing");
  let result: SyncResult;
  try {
    result = await withRetry(
      () => connector.sync({ storeId, db: admin, tokens: tokens! }),
      { retries: 2, baseMs: 500, shouldRetry: retryUnlessPermanent }
    );
  } catch (e) {
    // Without this, a sync that throws leaves the row on "syncing" forever:
    // the cron skips it (it only takes "connected") and the card spins.
    const message = (e as Error).message?.slice(0, 160) || "sync failed";
    await setStatus(admin, storeId, provider, "error", message);
    throw e;
  }

  if (result.ok) await markSynced(admin, storeId, provider);
  else await setStatus(admin, storeId, provider, "error", result.error ?? "sync failed");
  return result;
}
