import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredTokens } from "@/services/integrations/engine/types";
import {
  isStripeOAuthConfigured,
  isKlaviyoOAuthConfigured,
  isGoogleOAuthConfigured,
  isMetaOAuthConfigured,
  isInstagramConfigured,
  isTiktokConfigured,
} from "@/lib/env";
import {
  buildStripeAuthorizeUrl,
  deauthorizeStripe,
  exchangeStripeCode,
  syncStripe,
} from "@/services/integrations/stripe";
import {
  buildKlaviyoAuthorizeUrl,
  exchangeKlaviyoCode,
  syncKlaviyo,
} from "@/services/integrations/klaviyo";
import {
  buildGoogleAuthorizeUrl,
  exchangeGoogleCode,
} from "@/services/integrations/google";
import {
  buildMetaAuthorizeUrl,
  exchangeMetaCode,
  syncMeta,
} from "@/services/integrations/meta";
import {
  buildInstagramAuthorizeUrl,
  exchangeInstagramCode,
  syncInstagram,
} from "@/services/integrations/instagram";
import {
  buildTiktokAuthorizeUrl,
  exchangeTiktokCode,
  revokeTiktokToken,
  syncTiktok,
} from "@/services/integrations/tiktok";

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
  /** Durable credential for providers whose access token is short-lived. */
  refreshToken?: string | null;
  /** epoch ms — lets the hourly runner refresh before the token dies. */
  expiresAt?: number | null;
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
  /**
   * Tells the platform the grant is over when the merchant disconnects.
   * Optional and best-effort: most providers simply let the token rot.
   */
  revoke?: (tokens: StoredTokens) => Promise<void>;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderDef> = {
  // Meta Ads (Facebook + Instagram). Read-only: Nightflow reports on spend,
  // it never runs campaigns, so ads_read is the whole ask.
  meta: {
    id: "meta",
    label: "Meta Ads",
    isConfigured: isMetaOAuthConfigured,
    usesPkce: false,
    buildAuthorizeUrl: (state) => buildMetaAuthorizeUrl(state),
    exchangeCode: async (code) => {
      const r = await exchangeMetaCode(code);
      return r
        ? {
            accessToken: r.accessToken,
            expiresAt: r.expiresAt,
            metadata: { expiresAt: r.expiresAt },
          }
        : null;
    },
    sync: syncMeta,
  },
  // Instagram organic. Its own app credentials, and no Facebook Page needed —
  // see services/integrations/instagram.ts for why that matters.
  instagram: {
    id: "instagram",
    label: "Instagram",
    isConfigured: isInstagramConfigured,
    usesPkce: false,
    buildAuthorizeUrl: (state) => buildInstagramAuthorizeUrl(state),
    exchangeCode: async (code) => {
      const r = await exchangeInstagramCode(code);
      return r
        ? {
            accessToken: r.accessToken,
            expiresAt: r.expiresAt,
            metadata: { userId: r.userId, expiresAt: r.expiresAt },
          }
        : null;
    },
    sync: (accessToken) => syncInstagram(accessToken),
  },
  // TikTok organic (Login Kit + Display API). 24-hour access token renewed
  // from a 365-day refresh token — see services/integrations/tiktok.ts.
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    isConfigured: isTiktokConfigured,
    usesPkce: false,
    buildAuthorizeUrl: (state) => buildTiktokAuthorizeUrl(state),
    exchangeCode: async (code) => {
      const r = await exchangeTiktokCode(code);
      return r
        ? {
            accessToken: r.accessToken,
            refreshToken: r.refreshToken,
            expiresAt: r.expiresAt,
            metadata: {
              openId: r.openId,
              scope: r.scope,
              refreshExpiresAt: r.refreshExpiresAt,
            },
          }
        : null;
    },
    sync: (accessToken) => syncTiktok(accessToken),
    revoke: revokeTiktokToken,
  },
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
    revoke: async (tokens) => {
      const id = tokens.metadata?.stripe_user_id;
      if (typeof id === "string") await deauthorizeStripe(id);
    },
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
  google: {
    id: "google",
    label: "Google Analytics",
    isConfigured: isGoogleOAuthConfigured,
    usesPkce: false,
    buildAuthorizeUrl: (state) => buildGoogleAuthorizeUrl(state),
    exchangeCode: async (code) => {
      const r = await exchangeGoogleCode(code);
      // Store the refresh token (durable) + the chosen GA4 property id.
      return r
        ? { accessToken: r.refreshToken, metadata: { property_id: r.propertyId } }
        : null;
    },
    // GA4 powers traffic (not revenue) — fetched live, so no sync to run.
    sync: async () => ({ orders: 0, revenueCents: 0, days: 0 }),
  },
};

export function getOAuthProvider(provider: string): OAuthProviderDef | null {
  return Object.hasOwn(OAUTH_PROVIDERS, provider) ? OAUTH_PROVIDERS[provider] : null;
}
