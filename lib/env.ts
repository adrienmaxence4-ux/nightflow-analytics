/**
 * Centralised environment access.
 *
 * The whole app is designed to run in DEMO MODE when Supabase / AI keys are
 * absent, so it can be cloned and launched with zero configuration. As soon as
 * you add the keys to `.env.local` (or Vercel project settings), the real
 * services light up automatically.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** True when real Supabase credentials are configured. */
export const isSupabaseConfigured =
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;

/** True when a real AI provider key is configured. */
export const isAiConfigured = env.anthropicKey.length > 0;
