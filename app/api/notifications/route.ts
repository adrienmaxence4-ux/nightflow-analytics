import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/utils/format";
import type { Notification } from "@/types";
import type { ProductRow } from "@/types/database";

/**
 * GET /api/notifications
 * Builds REAL, CURRENT notifications from the user's live data — connected
 * integrations, low stock, and sales status. No AI call, so it's fast enough
 * for the sidebar badge. Returns { items, count } (count = actionable items).
 */
const PROVIDER_LABEL: Record<string, string> = {
  shopify: "Shopify",
  stripe: "Stripe",
  klaviyo: "Klaviyo",
  google: "Google Analytics",
};

export async function GET() {
  const empty = { items: [] as Notification[], count: 0 };

  const supabase = createClient();
  if (!supabase) return NextResponse.json(empty);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(empty);

  const { data: storeRows } = await supabase.from("stores").select("id").limit(1);
  const storeId = (storeRows?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json(empty);

  const [{ data: products }, { data: integrations }, { data: metrics }] =
    await Promise.all([
      supabase.from("products").select("*").eq("store_id", storeId),
      supabase
        .from("integrations")
        .select("provider, status, connected_at")
        .eq("store_id", storeId)
        .eq("status", "connected"),
      supabase.from("metrics_daily").select("revenue_cents, orders").eq("store_id", storeId),
    ]);

  const items: Notification[] = [];

  // 1) Connected integrations (most recent first).
  const integs =
    (integrations as { provider: string; connected_at: string | null }[] | null) ?? [];
  for (const it of integs) {
    items.push({
      id: `integ-${it.provider}`,
      type: "system",
      severity: "positive",
      icon: "🔌",
      title: `${PROVIDER_LABEL[it.provider] ?? it.provider} connecté`,
      body: "Source de données active et synchronisée.",
      time: it.connected_at ? timeAgo(it.connected_at) : "Récemment",
      read: false,
    });
  }

  // 2) Low-stock products (real).
  const prods = (products as ProductRow[] | null) ?? [];
  for (const p of prods.filter((p) => p.stock > 0 && p.stock <= 20)) {
    items.push({
      id: `stock-${p.id}`,
      type: "stock",
      severity: "warning",
      icon: "📦",
      title: `Stock faible : ${p.name}`,
      body: `Il reste ${p.stock} unités — anticipe le réassort avant rupture.`,
      time: "Maintenant",
      read: false,
    });
  }

  // 3) Sales status (real).
  const totalOrders = ((metrics as { orders: number }[] | null) ?? []).reduce(
    (t, m) => t + (m.orders ?? 0),
    0
  );
  if (prods.length > 0 && totalOrders === 0) {
    items.push({
      id: "sales-zero",
      type: "sales",
      severity: "critical",
      icon: "🛒",
      title: "Aucune vente enregistrée",
      body: "Tu as des produits en ligne mais 0 commande — teste ton tunnel de paiement de bout en bout.",
      time: "Maintenant",
      read: false,
    });
  }

  // Count = actionable (warning/critical) notifications.
  const count = items.filter(
    (n) => n.severity === "warning" || n.severity === "critical"
  ).length;

  return NextResponse.json({ items, count });
}
