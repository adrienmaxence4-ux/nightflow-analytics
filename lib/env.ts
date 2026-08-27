/**
 * Centralised environment access.
 *
 * The whole app is designed to run in DEMO MODE when no AI / Supabase keys are
 * present, so it can be cloned and launched with zero configuration. As soon as
 * you add keys (here or in Vercel project settings), the real services light up.
 *
 * AI providers (pick one via AI_PROVIDER):
 *  - "gemini"    → Google Gemini (free tier, no card) — needs GEMINI_API_KEY
 *  - "anthropic" → Claude (paid, best quality)        — needs ANTHROPIC_API_KEY
 *  - "auto" (default) → tries the free provider first, then Claude, then mock.
 *
 * GitHub Models was the free option until it was retired on 2026-07-30; its
 * endpoint now answers 410 for everyone, so it was removed rather than left as
 * a trap that shadows a working key.
 */

/**
 * Reads a variable by its canonical name, falling back to any variable whose
 * name matches `loose`. Meta's console labels its credentials in the user's own
 * language ("ID d'app Instagram"), and that label is what gets pasted into a
 * hosting dashboard as a variable name — so the loose match saves a rename
 * round-trip without the canonical name losing its status.
 */
function readEnv(canonical: string, loose: RegExp): string {
  const exact = process.env[canonical];
  if (exact?.trim()) return exact.trim();
  for (const [key, value] of Object.entries(process.env)) {
    if (loose.test(key) && value?.trim()) return value.trim();
  }
  return "";
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Service-role key — SERVER-ONLY, used exclusively by signature-verified
  // webhooks and secret-guarded cron workers (no user session). NEVER reaches
  // the browser or any user-facing route.
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  // AI provider selection
  aiProvider: (process.env.AI_PROVIDER ?? "auto").toLowerCase(),

  // Google Gemini (free tier — OpenAI-compatible surface)
  geminiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
  geminiEndpoint:
    process.env.GEMINI_ENDPOINT ??
    "https://generativelanguage.googleapis.com/v1beta/openai",
  // Google retires model names on its own schedule and answers 404 with the
  // replacement name, so this default is expected to move; GEMINI_MODEL
  // overrides it without a release.
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  // Gemini charges thinking tokens to the SAME budget as the answer, so an
  // unbounded reasoning effort silently eats the reply and the user gets a
  // sentence that stops mid-word. "low" keeps some reasoning without starving
  // the output; "none" is available on models that allow disabling it.
  geminiReasoningEffort: process.env.GEMINI_REASONING_EFFORT ?? "low",

  // Shopify OAuth (Dev Dashboard app: Client ID + Client secret)
  shopifyClientId:
    process.env.SHOPIFY_CLIENT_ID ?? process.env.SHOPIFY_API_KEY ?? "",
  shopifyClientSecret:
    process.env.SHOPIFY_CLIENT_SECRET ?? process.env.SHOPIFY_API_SECRET ?? "",
  // The write_* scopes are what let the Copilot APPLY a recommendation
  // (price, stock, visibility, discount codes) instead of only advising.
  // Drop them from SHOPIFY_SCOPES to run Nightflow strictly read-only —
  // the "Appliquer" button then explains that the reconnection is needed.
  shopifyScopes:
    process.env.SHOPIFY_SCOPES ??
    "read_products,write_products,read_orders,read_customers,read_inventory,write_inventory,write_discounts",

  // Stripe webhook signing secret (whsec_…) for /api/webhooks/stripe.
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // Stripe Connect OAuth ("Se connecter avec Stripe" — one-click, no API key).
  // STRIPE_CONNECT_CLIENT_ID = ca_… ; STRIPE_SECRET_KEY = platform sk_… (used to
  // exchange the OAuth code for the connected account's token).
  stripeClientId: process.env.STRIPE_CONNECT_CLIENT_ID ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",

  // Klaviyo OAuth ("Se connecter avec Klaviyo" — one-click, PKCE).
  klaviyoClientId: process.env.KLAVIYO_CLIENT_ID ?? "",
  klaviyoClientSecret: process.env.KLAVIYO_CLIENT_SECRET ?? "",

  // Google OAuth ("Se connecter avec Google" → Google Analytics GA4).
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // Integration token encryption (AES-256-GCM, key derived via scrypt). Set in
  // production to encrypt OAuth tokens at rest; unset = plaintext (dev only).
  integrationsEncKey: process.env.INTEGRATIONS_ENC_KEY ?? "",

  // Shared secret guarding cron / background-worker endpoints (sync, webhook
  // retry). Vercel Cron sends it as a Bearer token.
  cronSecret: process.env.CRON_SECRET ?? "",

  // Inworld TTS — French voice-over. Used by the ads pipeline (scripts/ads)
  // AND by /api/automation/tts, which the Auto-Growth routine calls to voice
  // its Reel scripts. The key is a base64-encoded credential pair, passed
  // verbatim in an `Authorization: Basic` header.
  inworldKey: process.env.INWORLD_API_KEY ?? "",
  inworldVoice: process.env.INWORLD_VOICE ?? "Étienne",

  // Meta Ads OAuth. Every Marketing API version before v24.0 was removed on
  // 2026-06-09, hence the v25.0 default; override without a release when Meta
  // ships the next one.
  metaAppId: process.env.META_APP_ID ?? "",
  metaAppSecret: process.env.META_APP_SECRET ?? "",
  metaApiVersion: process.env.META_API_VERSION ?? "v25.0",
  // Facebook Login for Business drives permissions and assets from a
  // configuration created in the app dashboard — the authorize URL carries its
  // id instead of a scope string. Public value, safe in a client-side URL.
  metaLoginConfigId: process.env.META_LOGIN_CONFIG_ID ?? "",

  // Instagram Login — a SEPARATE app from the Meta one, with its own id and
  // secret. It is what reads organic Reels: insights on a professional account
  // need no linked Facebook Page on this path, unlike the Facebook Login one.
  instagramAppId: readEnv(
    "INSTAGRAM_APP_ID",
    /^(?=.*instagram)(?=.*(app.?id|id.?d.?app)).*$/i
  ),
  instagramAppSecret: readEnv(
    "INSTAGRAM_APP_SECRET",
    /^(?=.*instagram)(?=.*(secret|secr[eè]te)).*$/i
  ),
  // TikTok Ads stays a stub: its Marketing API needs a sandbox→production
  // review plus a data-security audit, the most gated of the paid-social APIs.
  tiktokAppSecret: process.env.TIKTOK_APP_SECRET ?? "",

  // Admin allowlist — emails that may use the demo/test data tools. These tools
  // write or delete data, so they're hidden from real customers. Comma-separated.
  // Defaults to the project owner so the owner can test out of the box; override
  // with ADMIN_EMAILS in Vercel / .env to add teammates or lock it down.
  adminEmails: (process.env.ADMIN_EMAILS ?? "adrienmaxence4@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

/** True when real Supabase credentials are configured. */
export const isSupabaseConfigured =
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;

/** True when the Anthropic (Claude) key is configured. */
export const isAiConfigured = env.anthropicKey.length > 0;

/** True when a Google Gemini key is configured. */
export const isGeminiConfigured = env.geminiKey.length > 0;

/** True when Inworld TTS is configured (French voice-over). */
export const isInworldConfigured = env.inworldKey.length > 0;

/** True when ANY AI provider is usable. */
export const isAiEnabled = isAiConfigured || isGeminiConfigured;

/** True when Shopify OAuth credentials are configured. */
export const isShopifyConfigured =
  env.shopifyClientId.length > 0 && env.shopifyClientSecret.length > 0;

/** True when Stripe Connect OAuth is configured (one-click connect). */
export const isStripeOAuthConfigured =
  env.stripeClientId.length > 0 && env.stripeSecretKey.length > 0;

/** True when Klaviyo OAuth is configured (one-click connect). */
export const isKlaviyoOAuthConfigured =
  env.klaviyoClientId.length > 0 && env.klaviyoClientSecret.length > 0;

/** True when Google OAuth (Google Analytics) is configured. */
/** Meta Ads OAuth is live only once both halves of the app credential exist. */
export const isMetaOAuthConfigured =
  !!env.metaAppId && !!env.metaAppSecret;

/** Instagram Login is live once both halves of its own credential exist. */
export const isInstagramConfigured =
  !!env.instagramAppId && !!env.instagramAppSecret;

export const isGoogleOAuthConfigured =
  env.googleClientId.length > 0 && env.googleClientSecret.length > 0;
