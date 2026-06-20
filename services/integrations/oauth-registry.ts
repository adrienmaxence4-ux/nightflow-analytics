import type { SupabaseClient } from "@supabase/supabase-js";
import { isStripeOAuthConfigured, isKlaviyoOAuthConfigured } from "@/lib/env";
import {
  buildStripeAuthorizeUrl,
  exchangeStripeCode,
  syncStripe,
} from "@/services/integrations/stripe";
import {
  buildKlaviyoAuthorizeUrl,
  exchangeKlaviyoCode,
  syncKlaviyo,
} from "@/services/integrations/klaviyo";

/**
 * SERVER-ONLY. Registry of OAuth ("Se connecter avec …") providers.
 *
 * Each provider authorises the customer's own account in one click — no API
 * key. The shared /api/integrations/[provider]/oauth(+/callback) routes drive
 * every provider listed here. PKCE providers (usesPkce) get a code_verifier /
 * code_challenge handled by the routes.
 */

export interface OAuthExchangeResult {
  accessToken: string;
  metadata?: Record<string, unknown>;
}

export interface OAuthProviderDef {
  id: string;
  label: string;
  isConfigured: boolean;
  usesPkce: boolean;
  buildAuthorizeUrl: (state: string, codeChallenge?: string) => string;
  exchangeCode: (
    code: string,
    codeVerifier?: string
  ) => Promise<OAuthExchangeResult | null>;
  sync: (
    accessToken: string,
    storeId: string,
    db: SupabaseClient
  ) => Promise<{ orders: number; revenueCents: number; days: number }>;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderDef> = {
  stripe: {
    id: "stripe",
    label: "Stripe",
    isConfigured: isStripeOAuthConfigured,
    usesPkce: false,
    buildAuthorizeUrl: (state) => buildStripeAuthorizeUrl(state),
    exchangeCode: async (code) => {
      const r = await exchangeStripeCode(code);
      return r
        ? { accessToken: r.accessToken, metadata: { stripe_user_id: r.stripeUserId } }
        : null;
    },
    sync: syncStripe,
  },
  klaviyo: {
    id: "klaviyo",
    label: "Klaviyo",
    isConfigured: isKlaviyoOAuthConfigured,
    usesPkce: true,
    buildAuthorizeUrl: (state, codeChallenge) =>
      buildKlaviyoAuthorizeUrl(state, codeChallenge ?? ""),
    exchangeCode: async (code, codeVerifier) => {
      const r = await exchangeKlaviyoCode(code, codeVerifier ?? "");
      return r ? { accessToken: r.accessToken } : null;
    },
    sync: syncKlaviyo,
  },
};

export function getOAuthProvider(provider: string): OAuthProviderDef | null {
  return OAUTH_PROVIDERS[provider] ?? null;
}
