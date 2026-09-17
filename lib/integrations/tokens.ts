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
  const { error } = await db.from("integrations").upsert(
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
      // Only when the caller has something to say. A refresh that omits
      // metadata must keep the grant's (Instagram's userId is what the
      // deauthorize callback matches on — wiping it would orphan the row).
      ...(auth.metadata !== undefined ? { metadata: auth.metadata } : {}),
    },
    { onConflict: "store_id,provider" }
  );
  // Silently swallowing this would let the caller sync with the OLD token —
  // and for TikTok, whose refresh token rotates, lose the only valid one.
  if (error) {
    console.error(`[${provider}] store ${storeId}: token not persisted:`, error.message);
    throw new Error(`token not persisted for ${provider}`);
  }
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
  const metadata = row.metadata ?? {};
  // Rows connected before the callback wrote `token_expires_at` carry the
  // expiry in metadata only; reading it here is what lets the runner refresh
  // them instead of letting a 60-day Instagram grant lapse.
  const legacyExpiry =
    typeof metadata.expiresAt === "number" ? metadata.expiresAt : null;
  return {
    accessToken,
    refreshToken: decryptToken(row.refresh_token),
    expiresAt: row.token_expires_at
      ? new Date(row.token_expires_at).getTime()
      : legacyExpiry,
    metadata,
  };
}

/**
 * True when the access token is expired, or will be within `marginMs`.
 *
 * The margin is what makes an hourly cron useful: Instagram and Meta can only
 * extend a token that is STILL VALID, so a 60-second margin checked once an
 * hour almost always looks after the token has died. Those connectors pass a
 * margin of days; TikTok keeps the default, its refresh token does not depend
 * on the access token being alive.
 */
export function isExpired(tokens: StoredTokens, marginMs = 60_000): boolean {
  return tokens.expiresAt != null && Date.now() > tokens.expiresAt - marginMs;
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
