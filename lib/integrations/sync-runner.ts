import type { SupabaseClient } from "@supabase/supabase-js";
import { withRetry } from "@/lib/integrations/retry";
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
    await setStatus(admin, storeId, provider, "error", "no stored token");
    return { source: connector.source, events: 0, ok: false, error: "no token" };
  }

  // Token expiration detection + automatic refresh.
  if (isExpired(tokens)) {
    const refreshed = await connector.refresh(tokens);
    if (refreshed) {
      await saveTokens(admin, storeId, provider, refreshed);
      tokens = await getStoredTokens(admin, storeId, provider);
    } else {
      await setStatus(admin, storeId, provider, "expired", "token expired");
      return { source: connector.source, events: 0, ok: false, error: "expired" };
    }
  }
  if (!tokens) {
    await setStatus(admin, storeId, provider, "error", "token unavailable");
    return { source: connector.source, events: 0, ok: false, error: "no token" };
  }

  await setStatus(admin, storeId, provider, "syncing");
  const result = await withRetry(
    () => connector.sync({ storeId, db: admin, tokens: tokens! }),
    { retries: 2, baseMs: 500 }
  );

  if (result.ok) await markSynced(admin, storeId, provider);
  else await setStatus(admin, storeId, provider, "error", result.error ?? "sync failed");
  return result;
}
