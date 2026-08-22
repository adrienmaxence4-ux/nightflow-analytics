import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ActionError,
  type CommerceWriter,
  type DiscountInput,
  type DiscountResult,
  type RemoteProduct,
  type WriteCredential,
} from "./types";
import type { ProductRow } from "@/types/database";

/**
 * SERVER-ONLY. The simulation writer.
 *
 * Same contract as the Shopify and WooCommerce writers, but the "platform" is
 * the store's own catalogue in Supabase. It exists so the whole plan → apply →
 * undo loop can be exercised — by the owner testing a detection, or by anyone
 * seeing what the Copilot would do — before a real storefront is connected.
 *
 * It is deliberately NOT a silent fallback: a real connection always wins (see
 * resolveWriter), it is restricted to the project owner, and every plan it
 * produces is flagged `simulated` so the UI can say so in plain words. A button
 * that pretends to have changed a shop it never reached would be worse than no
 * button at all.
 */

export const DEMO_LABEL = "Démo";

/**
 * Builds a writer bound to one store. Credentials are irrelevant here — the
 * closure carries what it needs — but the signature stays identical to the real
 * writers so the engine treats all three the same way.
 */
export function makeDemoWriter(db: SupabaseClient, storeId: string): CommerceWriter {
  /** Products are addressed by external_id, exactly as on a real platform. */
  async function load(externalId: string): Promise<ProductRow | null> {
    const { data } = await db
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("external_id", externalId)
      .limit(1);
    return (data?.[0] as ProductRow | undefined) ?? null;
  }

  async function patch(
    externalId: string,
    values: Partial<ProductRow>
  ): Promise<void> {
    const { error } = await db
      .from("products")
      .update(values)
      .eq("store_id", storeId)
      .eq("external_id", externalId);
    if (error) {
      console.error("[demo:write]", error);
      throw new ActionError("platform", "La simulation a échoué — réessaie.");
    }
  }

  return {
    provider: "demo",
    label: DEMO_LABEL,

    async readProduct(_cred: WriteCredential, externalId): Promise<RemoteProduct | null> {
      const p = await load(externalId);
      if (!p) return null;
      return {
        externalId,
        title: p.name,
        priceCents: p.price_cents,
        stock: p.stock,
        published: p.published,
        handles: {},
      };
    },

    async setPrice(_cred, product, priceCents) {
      await patch(product.externalId, { price_cents: priceCents });
    },

    async setStock(_cred, product, quantity) {
      await patch(product.externalId, { stock: quantity });
    },

    async setPublished(_cred, product, published) {
      await patch(product.externalId, { published });
    },

    async createDiscount(_cred, input: DiscountInput): Promise<DiscountResult> {
      // Nothing to create: the demo store has no checkout. The action is still
      // recorded in applied_actions, so the log shows exactly what a real store
      // would have received.
      return { id: `demo-${input.code}`, code: input.code };
    },

    async deleteDiscount() {
      /* nothing was created */
    },
  };
}
