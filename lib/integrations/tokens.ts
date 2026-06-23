import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import type {
  AuthResult,
  ConnectionState,
  StoredTokens,
} from "@/services/integrations/engine/types";
import type { IntegrationRow } from "@/types/database";

/**
 * SERVER-ONLY. Read/write integration credentials with encryption at rest.
 * `db` may be either the RLS user client (OAuth callbacks) or the service-role
 * admin client (cron/webhook workers) — callers pass whichever fits the context.
 */

/** Persists tokens from an OAuth exchange / refresh (encrypted), status=connected. */
export async function saveTokens(
  db: SupabaseClient,
  storeId: string,
  provider: string,
  auth: AuthResult
): Promise<void> {
  await db.from("integrations").upsert(
    {
      store_id: storeId,
      provider,
      status: "connected",
      access_token: encryptToken(auth.accessToken),
      refresh_token: auth.refreshToken ? encryptToken(auth.refreshToken) : null,
      token_expires_at: auth.expiresAt
        ? new Date(auth.expiresAt).toISOString()
        : null,
      connected_at: new Date().toISOString(),
      last_error: null,
      metadata: auth.metadata ?? {},
    },
    { onConflict: "store_id,provider" }
  );
}

/** Reads + decrypts the stored credentials for a provider, or null. */
export async function getStoredTokens(
  db: SupabaseClient,
  storeId: string,
  provider: string
): Promise<StoredTokens | null> {
  const { data } = await db
    .from("integrations")
    .select("*")
    .eq("store_id", storeId)
    .eq("provider", provider)
    .limit(1);
  const row = (data?.[0] as IntegrationRow | undefined) ?? null;
  if (!row || !row.access_token) return null;
  const accessToken = decryptToken(row.access_token);
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: decryptToken(row.refresh_token),
    expiresAt: row.token_expires_at
      ? new Date(row.token_expires_at).getTime()
      : null,
    metadata: row.metadata ?? {},
  };
}

/** True when the access token is expired (or expires within 60s). */
export function isExpired(tokens: StoredTokens): boolean {
  return tokens.expiresAt != null && Date.now() > tokens.expiresAt - 60_000;
}

/** Updates the connection lifecycle state (+ optional error message). */
export async function setStatus(
  db: SupabaseClient,
  storeId: string,
  provider: string,
  status: ConnectionState,
  error?: string | null
): Promise<void> {
  // Map the code-level "not_connected" to the DB "disconnected".
  const dbStatus = status === "not_connected" ? "disconnected" : status;
  await db
    .from("integrations")
    .update({ status: dbStatus, last_error: error ?? null })
    .eq("store_id", storeId)
    .eq("provider", provider);
}

/** Marks a successful sync: status=connected, last_synced_at=now, error cleared. */
export async function markSynced(
  db: SupabaseClient,
  storeId: string,
  provider: string
): Promise<void> {
  await db
    .from("integrations")
    .update({
      status: "connected",
      last_synced_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("store_id", storeId)
    .eq("provider", provider);
}
