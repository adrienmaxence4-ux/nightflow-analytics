import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * SERVER-ONLY. Service-role Supabase client that BYPASSES Row-Level Security.
 *
 * It exists solely for trusted, session-less background contexts that cannot
 * carry a user JWT:
 *   • signature-verified webhook handlers (/api/webhooks/[provider])
 *   • secret-guarded cron workers (/api/integrations/sync, /jobs/process)
 *
 * It must NEVER be imported by a user-facing route, a Server Component rendered
 * for a user, or anything that reaches the browser. Returns null when the key
 * isn't configured, so the engine degrades gracefully instead of crashing.
 */
let cached: ReturnType<typeof createSupabaseClient<Database>> | null | undefined;

export function createAdminClient() {
  if (cached !== undefined) return cached;
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    cached = null;
    return null;
  }
  cached = createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isAdminClientConfigured(): boolean {
  return !!env.supabaseUrl && !!env.supabaseServiceKey;
}
