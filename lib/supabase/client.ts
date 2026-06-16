"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Browser-side Supabase client.
 *
 * Returns `null` when Supabase isn't configured (demo mode) so callers can
 * gracefully fall back to the mock auth layer instead of crashing.
 */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
