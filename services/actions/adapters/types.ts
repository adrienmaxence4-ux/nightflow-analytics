import type { ActionProvider } from "@/services/actions/catalog";

/**
 * SERVER-ONLY. The write side of the integration model.
 *
 * `services/integrations/*` reads from the platforms; this is the mirror image:
 * one small interface every commerce platform implements so the action engine
 * can change a price or a stock level without knowing whether the store runs
 * on Shopify or WooCommerce.
 *
 * Every method is a single, narrow operation — no free-form passthrough — so
 * the blast radius of the feature is exactly what the catalogue describes.
 */

/** Decrypted credentials for one connected commerce platform. */
export interface WriteCredential {
  provider: ActionProvider;
  /** `integrations.access_token`, decrypted (composite for WooCommerce). */
  token: string;
  metadata: Record<string, unknown>;
}

/** Live state read from the platform right before a write. */
export interface RemoteProduct {
  externalId: string;
  title: string;
  priceCents: number;
  /** null when the platform doesn't track inventory for this product. */
  stock: number | null;
  published: boolean;
  /** Platform handles the writer needs later (variant / inventory item ids). */
  handles: Record<string, string>;
}

export interface DiscountInput {
  code: string;
  percentage: number;
  endsAt: Date;
}

export interface DiscountResult {
  /** Platform id, kept so the action can be undone (delete the discount). */
  id: string;
  code: string;
}

export type ActionErrorCode =
  | "write_forbidden"
  | "not_found"
  | "unsupported"
  | "platform";

/**
 * A failure the customer can act on. `code` drives the UI: `write_forbidden`
 * shows the "autorise les modifications" reconnect CTA rather than a dead end.
 */
export class ActionError extends Error {
  readonly code: ActionErrorCode;
  constructor(code: ActionErrorCode, message: string) {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

export const WRITE_FORBIDDEN_MSG =
  "Nightflow n'a pas encore l'autorisation de modifier cette boutique. Reconnecte l'intégration en acceptant les droits de modification.";

export interface CommerceWriter {
  readonly provider: ActionProvider;
  readonly label: string;
  readProduct(
    cred: WriteCredential,
    externalId: string
  ): Promise<RemoteProduct | null>;
  setPrice(
    cred: WriteCredential,
    product: RemoteProduct,
    priceCents: number
  ): Promise<void>;
  setStock(
    cred: WriteCredential,
    product: RemoteProduct,
    quantity: number
  ): Promise<void>;
  setPublished(
    cred: WriteCredential,
    product: RemoteProduct,
    published: boolean
  ): Promise<void>;
  createDiscount(
    cred: WriteCredential,
    input: DiscountInput
  ): Promise<DiscountResult>;
  deleteDiscount(cred: WriteCredential, id: string): Promise<void>;
}
