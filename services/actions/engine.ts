import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getStoredTokens } from "@/lib/integrations/tokens";
import { getUserSubscription } from "@/services/billing/subscription";
import {
  ACTIONS,
  MAX_PRICE_CHANGE_PCT,
  euros,
  parseActionParams,
  type ActionKind,
  type ActionParams,
  type ActionProvider,
} from "@/services/actions/catalog";
import { shopifyWriter } from "@/services/actions/adapters/shopify";
import { wooWriter } from "@/services/actions/adapters/woocommerce";
import {
  ActionError,
  type CommerceWriter,
  type RemoteProduct,
  type WriteCredential,
} from "@/services/actions/adapters/types";
import type { AppliedActionRow, ProductRow } from "@/types/database";

/**
 * SERVER-ONLY. The action engine — what actually happens when the customer
 * clicks "Appliquer" on an AI recommendation.
 *
 * Three phases, on purpose:
 *   plan()    reads the live state of the store, computes an exact before/after
 *             diff and stores it as a single-use, 15-minute plan.
 *   execute() re-reads the store, refuses if it drifted since the plan, writes,
 *             then mirrors the change locally and logs it.
 *   undo()    replays the recorded before-state back onto the platform.
 *
 * Nothing here trusts the model: the AI only ever proposes a `kind` and a
 * target; parameters are validated by the catalogue, the product is re-read
 * from the customer's own store, and ownership is enforced twice (RLS + an
 * explicit store_id filter).
 */

const WRITERS: Record<ActionProvider, CommerceWriter> = {
  shopify: shopifyWriter,
  woocommerce: wooWriter,
};
/** Shopify first: it's the richer API and the more common connection. */
const PROVIDER_ORDER: ActionProvider[] = ["shopify", "woocommerce"];

export interface ActionChange {
  label: string;
  before: string;
  after: string;
}

export interface ActionPlan {
  id: string;
  kind: ActionKind;
  provider: ActionProvider;
  providerLabel: string;
  title: string;
  intro: string;
  icon: string;
  changes: ActionChange[];
  warnings: string[];
  reversible: boolean;
  expiresAt: string;
}

export interface AppliedAction {
  id: string;
  kind: ActionKind;
  provider: ActionProvider;
  summary: string;
  changes: ActionChange[];
  status: AppliedActionRow["status"];
  reversible: boolean;
  error: string | null;
  executedAt: string | null;
  createdAt: string;
}

export type Failure = {
  ok: false;
  error: string;
  /** Lets the UI pick the right recovery CTA (upgrade / connect / reconnect). */
  code:
    | "auth"
    | "gated"
    | "no_provider"
    | "invalid"
    | "not_found"
    | "expired"
    | "drifted"
    | "write_forbidden"
    | "unsupported"
    | "platform";
};
export type Result<T> = ({ ok: true } & T) | Failure;

const fail = (code: Failure["code"], error: string): Failure => ({
  ok: false,
  code,
  error,
});

// ── Context ──────────────────────────────────────────────────────────────────

interface ActionContext {
  db: SupabaseClient;
  userId: string;
  storeId: string;
}

/** Auth + store + plan gate. Everything below assumes a real, paying store. */
async function context(): Promise<Result<{ ctx: ActionContext }>> {
  const supabase = createClient();
  if (!supabase) return fail("auth", "Connexion à la base indisponible.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("auth", "Session expirée — reconnecte-toi.");

  const { data: stores } = await supabase.from("stores").select("id").limit(1);
  const storeId = (stores?.[0] as { id: string } | undefined)?.id;
  if (!storeId) {
    return fail("no_provider", "Aucune boutique connectée à Nightflow.");
  }

  const { plan } = await getUserSubscription();
  if (!plan.integrations) {
    return fail(
      "gated",
      "Les actions automatiques sont réservées aux offres Pro et Scale."
    );
  }

  return {
    ok: true,
    ctx: { db: supabase as unknown as SupabaseClient, userId: user.id, storeId },
  };
}

/** The commerce platform Nightflow will write to, with decrypted credentials. */
async function resolveWriter(
  ctx: ActionContext
): Promise<Result<{ writer: CommerceWriter; cred: WriteCredential }>> {
  const { data } = await ctx.db
    .from("integrations")
    .select("provider")
    .eq("store_id", ctx.storeId)
    .eq("status", "connected");
  const connected = new Set(
    ((data as { provider: string }[] | null) ?? []).map((r) => r.provider)
  );
  const provider = PROVIDER_ORDER.find((p) => connected.has(p));
  if (!provider) {
    return fail(
      "no_provider",
      "Connecte Shopify ou WooCommerce pour que Nightflow puisse appliquer les recommandations."
    );
  }
  const tokens = await getStoredTokens(ctx.db, ctx.storeId, provider);
  if (!tokens) {
    return fail("no_provider", "Identifiants introuvables — reconnecte l'intégration.");
  }
  return {
    ok: true,
    writer: WRITERS[provider],
    cred: { provider, token: tokens.accessToken, metadata: tokens.metadata },
  };
}

/**
 * Loads a product of THIS store. A forged id resolves to nothing, not to
 * another tenant's product (RLS + explicit store filter).
 */
async function loadProduct(
  ctx: ActionContext,
  productId: string
): Promise<ProductRow | null> {
  const { data } = await ctx.db
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("store_id", ctx.storeId)
    .limit(1);
  return (data?.[0] as ProductRow | undefined) ?? null;
}

// ── Plan ─────────────────────────────────────────────────────────────────────

interface PlanDraft {
  title: string;
  summary: string;
  changes: ActionChange[];
  warnings: string[];
  beforeState: Record<string, unknown>;
}

const stockLabel = (n: number | null) =>
  n == null ? "non suivi" : `${n.toLocaleString("fr-FR")} unité(s)`;

function draftForProduct(
  params: Extract<ActionParams, { productId: string }>,
  remote: RemoteProduct
): Result<{ draft: PlanDraft }> {
  const before = {
    externalId: remote.externalId,
    priceCents: remote.priceCents,
    stock: remote.stock,
    published: remote.published,
  };

  if (params.kind === "product.price.update") {
    if (remote.priceCents <= 0) {
      return fail("unsupported", "Le prix actuel de ce produit est introuvable.");
    }
    const deltaPct =
      (Math.abs(params.newPriceCents - remote.priceCents) / remote.priceCents) * 100;
    if (deltaPct > MAX_PRICE_CHANGE_PCT) {
      return fail(
        "invalid",
        `Variation de ${deltaPct.toFixed(0)} % refusée : Nightflow ne modifie jamais un prix de plus de ${MAX_PRICE_CHANGE_PCT} % en une fois.`
      );
    }
    if (params.newPriceCents === remote.priceCents) {
      return fail("invalid", "Ce produit est déjà à ce prix.");
    }
    const down = params.newPriceCents < remote.priceCents;
    return {
      ok: true,
      draft: {
        title: `${down ? "Baisser" : "Augmenter"} le prix de ${remote.title}`,
        summary: `Prix de « ${remote.title} » : ${euros(remote.priceCents)} → ${euros(
          params.newPriceCents
        )}`,
        changes: [
          {
            label: "Prix de vente",
            before: euros(remote.priceCents),
            after: euros(params.newPriceCents),
          },
        ],
        warnings:
          deltaPct >= 20
            ? [
                `Variation importante (${deltaPct.toFixed(
                  0
                )} %) — vérifie ta marge avant d'appliquer.`,
              ]
            : [],
        beforeState: before,
      },
    };
  }

  if (params.kind === "product.stock.set") {
    if (remote.stock == null) {
      return fail(
        "unsupported",
        `${remote.title} n'a pas de suivi de stock actif sur ta boutique.`
      );
    }
    if (remote.stock === params.quantity) {
      return fail("invalid", "Le stock est déjà à cette valeur.");
    }
    return {
      ok: true,
      draft: {
        title: `Réassortir ${remote.title}`,
        summary: `Stock de « ${remote.title} » : ${stockLabel(
          remote.stock
        )} → ${stockLabel(params.quantity)}`,
        changes: [
          {
            label: "Stock disponible",
            before: stockLabel(remote.stock),
            after: stockLabel(params.quantity),
          },
        ],
        warnings: [
          "Le stock est déclaré dans ta boutique — assure-toi que les unités sont bien physiquement disponibles.",
        ],
        beforeState: before,
      },
    };
  }

  // product.unpublish
  if (!remote.published) {
    return fail("invalid", "Ce produit est déjà masqué de ta vitrine.");
  }
  return {
    ok: true,
    draft: {
      title: `Masquer ${remote.title}`,
      summary: `« ${remote.title} » retiré de la vitrine`,
      changes: [{ label: "Visibilité", before: "En ligne", after: "Masqué" }],
      warnings: [
        "Le produit disparaît de ta boutique jusqu'à ce que tu le republies (annulation en un clic).",
      ],
      beforeState: before,
    },
  };
}

function draftForDiscount(
  params: Extract<ActionParams, { kind: "discount.create" }>
): PlanDraft {
  const endsAt = new Date(Date.now() + params.days * 86_400_000);
  return {
    title: `Créer le code promo ${params.code}`,
    summary: `Code promo ${params.code} — ${params.percentage} % pendant ${params.days} jour(s)`,
    changes: [
      { label: "Code", before: "—", after: params.code },
      { label: "Remise", before: "—", after: `−${params.percentage} % sur la commande` },
      {
        label: "Valable jusqu'au",
        before: "—",
        after: endsAt.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      },
    ],
    warnings: [
      "Le code sera immédiatement utilisable par tous tes clients — n'annonce pas la promo avant de l'avoir appliquée.",
    ],
    beforeState: { endsAt: endsAt.toISOString() },
  };
}

/**
 * Phase 1. Reads the live store, builds the exact diff, and persists a
 * single-use plan. Nothing is written to the platform here.
 */
export async function planAction(
  raw: unknown,
  sourceRef?: string | null
): Promise<Result<{ plan: ActionPlan }>> {
  const c = await context();
  if (!c.ok) return c;
  const { ctx } = c;

  const parsed = parseActionParams(raw);
  if (!parsed.params) return fail("invalid", parsed.error ?? "Action invalide.");
  const params = parsed.params;

  const w = await resolveWriter(ctx);
  if (!w.ok) return w;
  const { writer, cred } = w;

  let draft: PlanDraft;
  try {
    if (params.kind === "discount.create") {
      draft = draftForDiscount(params);
    } else {
      const product = await loadProduct(ctx, params.productId);
      if (!product) return fail("not_found", "Produit introuvable dans ton catalogue.");
      if (!product.external_id) {
        return fail(
          "unsupported",
          `« ${product.name} » n'est pas relié à ta boutique — resynchronise ton catalogue.`
        );
      }
      const remote = await writer.readProduct(cred, product.external_id);
      if (!remote) {
        return fail("not_found", `« ${product.name} » n'existe plus sur ${writer.label}.`);
      }
      const d = draftForProduct(params, remote);
      if (!d.ok) return d;
      draft = d.draft;
    }
  } catch (e) {
    return failFromError(e);
  }

  const def = ACTIONS[params.kind];
  const { data, error } = await ctx.db
    .from("applied_actions")
    .insert({
      store_id: ctx.storeId,
      user_id: ctx.userId,
      kind: params.kind,
      provider: cred.provider,
      source_ref: sourceRef ?? null,
      summary: draft.summary,
      params,
      changes: draft.changes,
      before_state: draft.beforeState,
      status: "planned",
      reversible: def.reversible,
    })
    .select("id, expires_at")
    .single();
  const row = data as { id: string; expires_at: string } | null;
  if (error || !row) {
    console.error("[actions] plan insert failed", error);
    return fail("platform", "Impossible de préparer l'action — réessaie.");
  }

  return {
    ok: true,
    plan: {
      id: row.id,
      kind: params.kind,
      provider: cred.provider,
      providerLabel: writer.label,
      title: draft.title,
      intro: def.intro,
      icon: def.icon,
      changes: draft.changes,
      warnings: draft.warnings,
      reversible: def.reversible,
      expiresAt: row.expires_at,
    },
  };
}

// ── Execute ──────────────────────────────────────────────────────────────────

/**
 * Phase 2. Applies the plan for real. Refuses if the plan expired, was already
 * used, or if the store changed under it since the diff was computed — a stale
 * "before" would make the undo wrong, which is worse than a retry.
 */
export async function executeAction(
  planId: string
): Promise<Result<{ action: AppliedAction }>> {
  const c = await context();
  if (!c.ok) return c;
  const { ctx } = c;

  const { data } = await ctx.db
    .from("applied_actions")
    .select("*")
    .eq("id", planId)
    .eq("store_id", ctx.storeId)
    .limit(1);
  const row = (data?.[0] as AppliedActionRow | undefined) ?? null;
  if (!row) return fail("not_found", "Action introuvable.");
  if (row.status !== "planned") {
    return fail("invalid", "Cette action a déjà été traitée.");
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return fail("expired", "La confirmation a expiré — relance l'action.");
  }

  const parsed = parseActionParams(row.params);
  if (!parsed.params) return fail("invalid", "Action invalide.");
  const params = parsed.params;

  const w = await resolveWriter(ctx);
  if (!w.ok) return w;
  const { writer, cred } = w;

  let result: Record<string, unknown> = {};
  let beforeState = row.before_state;
  try {
    if (params.kind === "discount.create") {
      const endsAt = new Date(
        String(row.before_state.endsAt ?? Date.now() + params.days * 86_400_000)
      );
      const created = await writer.createDiscount(cred, {
        code: params.code,
        percentage: params.percentage,
        endsAt,
      });
      result = { discountId: created.id, code: created.code };
    } else {
      const product = await loadProduct(ctx, params.productId);
      if (!product?.external_id) {
        return fail("not_found", "Produit introuvable dans ton catalogue.");
      }
      const remote = await writer.readProduct(cred, product.external_id);
      if (!remote) return fail("not_found", `Produit introuvable sur ${writer.label}.`);

      const drift = detectDrift(params.kind, row.before_state, remote);
      if (drift) return fail("drifted", drift);

      // Re-record the before-state from the fresh read: it's the state we are
      // actually overwriting, so it's the one the undo must restore.
      beforeState = {
        externalId: remote.externalId,
        priceCents: remote.priceCents,
        stock: remote.stock,
        published: remote.published,
      };

      if (params.kind === "product.price.update") {
        await writer.setPrice(cred, remote, params.newPriceCents);
        await mirror(ctx, params.productId, { price_cents: params.newPriceCents });
        result = { priceCents: params.newPriceCents };
      } else if (params.kind === "product.stock.set") {
        await writer.setStock(cred, remote, params.quantity);
        await mirror(ctx, params.productId, { stock: params.quantity });
        result = { stock: params.quantity };
      } else {
        await writer.setPublished(cred, remote, false);
        result = { published: false };
      }
    }
  } catch (e) {
    const f = failFromError(e);
    await ctx.db
      .from("applied_actions")
      .update({ status: "failed", error: f.error })
      .eq("id", row.id);
    return f;
  }

  const executedAt = new Date().toISOString();
  await ctx.db
    .from("applied_actions")
    .update({
      status: "applied",
      result,
      before_state: beforeState,
      error: null,
      executed_at: executedAt,
    })
    .eq("id", row.id);

  await notify(ctx, `Action appliquée : ${row.summary}`, writer.label);

  return {
    ok: true,
    action: {
      id: row.id,
      kind: params.kind,
      provider: cred.provider,
      summary: row.summary,
      changes: row.changes,
      status: "applied",
      reversible: row.reversible,
      error: null,
      executedAt,
      createdAt: row.created_at,
    },
  };
}

/** Did the store change between the plan and the click? Returns a message. */
function detectDrift(
  kind: ActionKind,
  before: Record<string, unknown>,
  remote: RemoteProduct
): string | null {
  if (kind === "product.price.update" && before.priceCents !== remote.priceCents) {
    return `Le prix a changé entre-temps (${euros(
      Number(before.priceCents) || 0
    )} → ${euros(remote.priceCents)}). Relance l'action pour repartir du prix actuel.`;
  }
  if (kind === "product.stock.set" && before.stock !== remote.stock) {
    return `Le stock a changé entre-temps (${stockLabel(
      before.stock as number | null
    )} → ${stockLabel(remote.stock)}). Relance l'action.`;
  }
  if (kind === "product.unpublish" && !remote.published) {
    return "Ce produit est déjà masqué.";
  }
  return null;
}

// ── Undo ─────────────────────────────────────────────────────────────────────

/** Phase 3. Replays the recorded before-state back onto the platform. */
export async function undoAction(
  actionId: string
): Promise<Result<{ action: AppliedAction }>> {
  const c = await context();
  if (!c.ok) return c;
  const { ctx } = c;

  const { data } = await ctx.db
    .from("applied_actions")
    .select("*")
    .eq("id", actionId)
    .eq("store_id", ctx.storeId)
    .limit(1);
  const row = (data?.[0] as AppliedActionRow | undefined) ?? null;
  if (!row) return fail("not_found", "Action introuvable.");
  if (row.status !== "applied") {
    return fail("invalid", "Seule une action appliquée peut être annulée.");
  }
  if (!row.reversible) {
    return fail("unsupported", "Cette action n'est pas réversible automatiquement.");
  }

  const parsed = parseActionParams(row.params);
  if (!parsed.params) return fail("invalid", "Action invalide.");
  const params = parsed.params;

  const w = await resolveWriter(ctx);
  if (!w.ok) return w;
  const { writer, cred } = w;

  try {
    if (params.kind === "discount.create") {
      const id = String(row.result.discountId ?? "");
      if (!id) return fail("unsupported", "Code promo introuvable côté boutique.");
      await writer.deleteDiscount(cred, id);
    } else {
      const externalId = String(row.before_state.externalId ?? "");
      const remote = externalId ? await writer.readProduct(cred, externalId) : null;
      if (!remote) return fail("not_found", `Produit introuvable sur ${writer.label}.`);

      if (params.kind === "product.price.update") {
        const priceCents = Number(row.before_state.priceCents) || 0;
        await writer.setPrice(cred, remote, priceCents);
        await mirror(ctx, params.productId, { price_cents: priceCents });
      } else if (params.kind === "product.stock.set") {
        const stock = Number(row.before_state.stock) || 0;
        await writer.setStock(cred, remote, stock);
        await mirror(ctx, params.productId, { stock });
      } else {
        await writer.setPublished(cred, remote, true);
      }
    }
  } catch (e) {
    return failFromError(e);
  }

  await ctx.db
    .from("applied_actions")
    .update({ status: "undone", undone_at: new Date().toISOString() })
    .eq("id", row.id);

  await notify(ctx, `Action annulée : ${row.summary}`, writer.label);

  return {
    ok: true,
    action: {
      id: row.id,
      kind: params.kind,
      provider: cred.provider,
      summary: row.summary,
      changes: row.changes,
      status: "undone",
      reversible: row.reversible,
      error: null,
      executedAt: row.executed_at,
      createdAt: row.created_at,
    },
  };
}

// ── History ──────────────────────────────────────────────────────────────────

/** The audit log shown under the recommendations ("ce que Nightflow a fait"). */
export async function listActions(limit = 20): Promise<AppliedAction[]> {
  const c = await context();
  if (!c.ok) return [];
  const { ctx } = c;
  const { data } = await ctx.db
    .from("applied_actions")
    .select("*")
    .eq("store_id", ctx.storeId)
    .neq("status", "planned")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as AppliedActionRow[] | null) ?? []).map((r) => ({
    id: r.id,
    kind: r.kind as ActionKind,
    provider: r.provider as ActionProvider,
    summary: r.summary,
    changes: r.changes ?? [],
    status: r.status,
    reversible: r.reversible,
    error: r.error,
    executedAt: r.executed_at,
    createdAt: r.created_at,
  }));
}

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Keeps the local catalogue in step so the dashboard doesn't show stale data
 * until the next hourly sync. Best-effort: the platform is the source of truth.
 */
async function mirror(
  ctx: ActionContext,
  productId: string,
  patch: Partial<ProductRow>
): Promise<void> {
  try {
    await ctx.db
      .from("products")
      .update(patch)
      .eq("id", productId)
      .eq("store_id", ctx.storeId);
  } catch {
    /* the next sync will reconcile */
  }
}

/** Every autonomous change leaves a trace in the bell — no silent writes. */
async function notify(
  ctx: ActionContext,
  title: string,
  provider: string
): Promise<void> {
  try {
    await ctx.db.from("notifications").insert({
      user_id: ctx.userId,
      store_id: ctx.storeId,
      type: "ai",
      severity: "info",
      icon: "🤖",
      title,
      body: `Modification effectuée par Nightflow sur ${provider}.`,
    });
  } catch {
    /* never let the log break the action */
  }
}

function failFromError(e: unknown): Failure {
  if (e instanceof ActionError) return fail(e.code, e.message);
  console.error("[actions] unexpected", e);
  return fail("platform", "La modification a échoué — réessaie dans un instant.");
}
