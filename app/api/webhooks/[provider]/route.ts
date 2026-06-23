import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEvents, enqueueJob } from "@/lib/integrations/queue";
import { getConnector } from "@/services/integrations/engine/connectors";
import { env } from "@/lib/env";

/**
 * POST /api/webhooks/[provider]
 * Universal webhook ingress: verify the provider signature, resolve the store,
 * normalize the payload (PII stripped), and persist the events. Failures after
 * a valid signature are queued for retry with exponential backoff.
 *
 * Runs with the service-role client (no user session). The signature check IS
 * the authentication — an unsigned/forged request is rejected with 401.
 */
export const dynamic = "force-dynamic";

function lowerHeaders(req: Request): Record<string, string> {
  const h: Record<string, string> = {};
  req.headers.forEach((v, k) => (h[k.toLowerCase()] = v));
  return h;
}

function secretFor(provider: string): string {
  switch (provider) {
    case "stripe":
      return env.stripeWebhookSecret;
    case "shopify":
      return env.shopifyClientSecret;
    case "meta":
      return env.metaAppSecret;
    case "tiktok":
      return env.tiktokAppSecret;
    default:
      return "";
  }
}

async function resolveStoreId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  provider: string,
  headers: Record<string, string>,
  payload: unknown
): Promise<string | null> {
  const dbProvider = provider === "ga4" ? "google" : provider;
  const { data } = await admin
    .from("integrations")
    .select("store_id, metadata")
    .eq("provider", dbProvider)
    .eq("status", "connected");
  const rows = (data as { store_id: string; metadata: Record<string, unknown> }[] | null) ?? [];
  if (rows.length === 0) return null;

  if (provider === "shopify") {
    const shop = headers["x-shopify-shop-domain"];
    return rows.find((r) => r.metadata?.shop === shop)?.store_id ?? null;
  }
  if (provider === "stripe") {
    const account = (payload as { account?: string }).account;
    return (
      rows.find((r) => r.metadata?.stripe_user_id === account)?.store_id ??
      rows[0].store_id
    );
  }
  return rows[0].store_id;
}

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const connector = getConnector(params.provider);
  if (!connector) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // Can't verify/persist without the service role — ask the sender to retry.
    return NextResponse.json({ error: "engine offline" }, { status: 503 });
  }

  const rawBody = await req.text();
  const headers = lowerHeaders(req);
  const secret = secretFor(params.provider);

  if (!connector.verifyWebhook({ rawBody, headers, secret })) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const storeId = await resolveStoreId(admin, params.provider, headers, payload);
  if (!storeId) {
    // Signed but we don't have a matching connected store — accept & drop.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const events = connector.normalizeWebhook(payload, storeId);
    const n = await enqueueEvents(admin, events);
    return NextResponse.json({ ok: true, events: n });
  } catch (e) {
    // Persist for retry rather than failing the provider's delivery.
    await enqueueJob(admin, {
      storeId,
      provider: params.provider,
      kind: "webhook",
      payload: { body: rawBody },
    }).catch(() => {});
    console.error(`[webhook:${params.provider}]`, e);
    return NextResponse.json({ ok: true, queued: true });
  }
}
