import type { SupabaseClient } from "@supabase/supabase-js";
import { validateStripeKey, syncStripe } from "@/services/integrations/stripe";
import { validateKlaviyoKey, syncKlaviyo } from "@/services/integrations/klaviyo";
import { validateWixKey, syncWix } from "@/services/integrations/wix";
import { validateWooKey, syncWoo } from "@/services/integrations/woocommerce";
import {
  validateWindsorKey,
  syncWindsor,
  extractWindsorKey,
} from "@/services/integrations/windsor";

/**
 * SERVER-ONLY. Registry of API-KEY based integrations (multi-tenant).
 *
 * Unlike Shopify (OAuth), these providers authenticate with a per-customer
 * secret/restricted/private key that the user pastes in the app. The key is
 * stored per store (RLS-isolated) in `integrations.access_token`. The same
 * generic /api/integrations/[provider] routes drive connect / sync / disconnect
 * for every provider listed here.
 */

export interface SyncSummary {
  orders: number;
  revenueCents: number;
  days: number;
}

export interface KeyedProviderDef {
  id: string;
  label: string;
  /**
   * Cleans up what the customer pasted before it is validated and stored.
   * Some providers hand out a ready-made request URL rather than a bare key,
   * and rejecting the string their own dashboard told the user to copy is a
   * self-inflicted support ticket.
   */
  normalize?: (raw: string) => string;
  /**
   * Shown instead of the generic "Clé API manquante" when normalize() empties
   * the paste — for a provider whose dashboard hands out a URL, that's the
   * one moment worth explaining which part of it is the actual credential.
   */
  missingKeyHint?: string;
  /**
   * True (or `{ ok: true }`) when the pasted key is valid. Most providers only
   * ever say yes/no; Windsor additionally reports *why* it said no
   * (`{ ok: false, reason }`) so the connect route can show that instead of
   * one fixed "invalid key" string regardless of the actual cause.
   */
  validate: (key: string) => Promise<boolean | { ok: boolean; reason?: string }>;
  /** Pulls the provider's data into Supabase. */
  sync: (key: string, storeId: string, db: SupabaseClient) => Promise<SyncSummary>;
}

export const KEYED_PROVIDERS: Record<string, KeyedProviderDef> = {
  stripe: {
    id: "stripe",
    label: "Stripe",
    validate: validateStripeKey,
    sync: syncStripe,
  },
  klaviyo: {
    id: "klaviyo",
    label: "Klaviyo",
    validate: validateKlaviyoKey,
    sync: syncKlaviyo,
  },
  // BÊTA — credential is the composite `siteId::apiKey` (see wix.ts).
  wix: {
    id: "wix",
    label: "Wix",
    validate: validateWixKey,
    sync: syncWix,
  },
  // Credential is the composite `url::consumer_key::consumer_secret` (see
  // woocommerce.ts) — standard WooCommerce REST v3, read-only keys.
  woocommerce: {
    id: "woocommerce",
    label: "WooCommerce",
    validate: validateWooKey,
    sync: syncWoo,
  },
  // Brings Meta Ads and TikTok Ads (and every other platform the customer
  // connects on Windsor) without waiting on each network's app review.
  windsor: {
    id: "windsor",
    label: "Windsor.ai",
    normalize: extractWindsorKey,
    missingKeyHint:
      "Colle la clé API Windsor.ai, ou l'URL de requête complète (avec ?api_key=…) — pas le lien onboard.windsor.ai de la page d'accueil.",
    validate: validateWindsorKey,
    sync: syncWindsor,
  },
};

export function getKeyedProvider(provider: string): KeyedProviderDef | null {
  return KEYED_PROVIDERS[provider] ?? null;
}

/** The provider ids the app exposes as key-based connectors. */
export const KEYED_PROVIDER_IDS = Object.keys(KEYED_PROVIDERS);
