import type { SupabaseClient } from "@supabase/supabase-js";
import { validateStripeKey, syncStripe } from "@/services/integrations/stripe";
import { validateKlaviyoKey, syncKlaviyo } from "@/services/integrations/klaviyo";
import { validateWixKey, syncWix } from "@/services/integrations/wix";
import { validateWooKey, syncWoo } from "@/services/integrations/woocommerce";

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
  /** Returns true when the pasted key is valid (can read the account). */
  validate: (key: string) => Promise<boolean>;
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
};

export function getKeyedProvider(provider: string): KeyedProviderDef | null {
  return KEYED_PROVIDERS[provider] ?? null;
}

/** The provider ids the app exposes as key-based connectors. */
export const KEYED_PROVIDER_IDS = Object.keys(KEYED_PROVIDERS);
