/**
 * Centralised environment access.
 *
 * The whole app is designed to run in DEMO MODE when no AI / Supabase keys are
 * present, so it can be cloned and launched with zero configuration. As soon as
 * you add keys (here or in Vercel project settings), the real services light up.
 *
 * AI providers (pick one via AI_PROVIDER):
 *  - "github"    → GitHub Models (FREE, for testing) — needs GITHUB_MODELS_TOKEN
 *  - "anthropic" → Claude (paid, for production)      — needs ANTHROPIC_API_KEY
 *  - "auto" (default) → Anthropic if its key is set, else GitHub, else mock.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  // AI provider selection
  aiProvider: (process.env.AI_PROVIDER ?? "auto").toLowerCase(),

  // GitHub Models (free tier — OpenAI-compatible)
  githubToken:
    process.env.GITHUB_MODELS_TOKEN ?? process.env.GITHUB_TOKEN ?? "",
  githubEndpoint:
    process.env.GITHUB_MODELS_ENDPOINT ?? "https://models.github.ai/inference",
  githubModel: process.env.GITHUB_MODEL ?? "openai/gpt-4o-mini",

  // Shopify OAuth (Dev Dashboard app: Client ID + Client secret)
  shopifyClientId:
    process.env.SHOPIFY_CLIENT_ID ?? process.env.SHOPIFY_API_KEY ?? "",
  shopifyClientSecret:
    process.env.SHOPIFY_CLIENT_SECRET ?? process.env.SHOPIFY_API_SECRET ?? "",
  shopifyScopes:
    process.env.SHOPIFY_SCOPES ??
    "read_products,read_orders,read_customers,read_inventory",

  // Stripe Connect OAuth ("Se connecter avec Stripe" — one-click, no API key).
  // STRIPE_CONNECT_CLIENT_ID = ca_… ; STRIPE_SECRET_KEY = platform sk_… (used to
  // exchange the OAuth code for the connected account's token).
  stripeClientId: process.env.STRIPE_CONNECT_CLIENT_ID ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
};

/** True when real Supabase credentials are configured. */
export const isSupabaseConfigured =
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;

/** True when the Anthropic (Claude) key is configured. */
export const isAiConfigured = env.anthropicKey.length > 0;

/** True when a GitHub Models token is configured. */
export const isGithubConfigured = env.githubToken.length > 0;

/** True when ANY AI provider is usable. */
export const isAiEnabled = isAiConfigured || isGithubConfigured;

/** True when Shopify OAuth credentials are configured. */
export const isShopifyConfigured =
  env.shopifyClientId.length > 0 && env.shopifyClientSecret.length > 0;

/** True when Stripe Connect OAuth is configured (one-click connect). */
export const isStripeOAuthConfigured =
  env.stripeClientId.length > 0 && env.stripeSecretKey.length > 0;
