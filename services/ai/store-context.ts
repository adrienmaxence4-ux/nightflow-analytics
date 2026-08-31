import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { CAMPAIGNS, PRODUCTS, RANGE_DATA, STORE } from "@/services/mock/data";
import {
  buildSocialOverview,
  emptyOverview,
  type SocialOverview,
} from "@/services/social/overview";
import type {
  CampaignRow,
  MetricDailyRow,
  ProductRow,
  StoreRow,
} from "@/types/database";

/**
 * SERVER-ONLY. Builds a compact text snapshot of the user's store for the AI.
 * Uses the real Supabase data when available; otherwise falls back to the
 * MoonStore demo so the Copilot always has something concrete to reason about.
 */

export interface StoreContext {
  storeName: string;
  source: "db" | "demo";
  summary: string;
  storeId: string | null;
}

/**
 * Fetches products/campaigns/metrics/social for a resolved store and formats
 * them — shared by the cookie-authenticated path below and by
 * buildStoreContextForStore, which a trusted server-to-server caller (no
 * browser session, no cookies) uses to reach the same real context.
 */
async function buildContextForResolvedStore(
  db: SupabaseClient,
  store: StoreRow,
  withVisits: boolean
): Promise<StoreContext | null> {
  const [products, campaigns, metrics, social] = await Promise.all([
    db.from("products").select("*").eq("store_id", store.id),
    db.from("campaigns").select("*").eq("store_id", store.id),
    db
      .from("metrics_daily")
      .select("*")
      .eq("store_id", store.id)
      .order("date", { ascending: false })
      .limit(14),
    // Organic social is often the only thing bringing people in. Without it
    // the Copilot reasons about an empty funnel and blames the store. A
    // social outage must never cost the user their whole context, so it
    // degrades to "not connected" rather than throwing.
    //
    // withVisits mirrors the exact boundary /api/social/route.ts already
    // draws: tracking-code visit counts are Nightflow's own site analytics,
    // meaningful only for the owner — never for a future customer's chat.
    buildSocialOverview(store.id, { withVisits }).catch(() => emptyOverview()),
  ]);
  const prods = (products.data as ProductRow[] | null) ?? [];
  if (prods.length === 0) return null;
  return {
    storeName: store.name,
    source: "db",
    storeId: store.id,
    summary: formatRealContext(
      store,
      prods,
      (campaigns.data as CampaignRow[] | null) ?? [],
      (metrics.data as MetricDailyRow[] | null) ?? [],
      social
    ),
  };
}

export async function buildStoreContext(): Promise<StoreContext> {
  const supabase = createClient();
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: stores } = await supabase
          .from("stores")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        const store = (stores?.[0] as StoreRow | undefined) ?? null;
        if (store) {
          const ctx = await buildContextForResolvedStore(
            supabase as unknown as SupabaseClient,
            store,
            isAdminEmail(user.email)
          );
          if (ctx) return ctx;
        }
      }
    } catch {
      /* fall through to demo context */
    }
  }
  return {
    storeName: STORE.name,
    source: "demo",
    storeId: null,
    summary: formatDemoContext(),
  };
}

/**
 * Same real context, resolved without a browser session — for a trusted
 * server-to-server caller (a scheduled automation, never a customer-facing
 * route) that already knows which store it means. `db` must be the
 * service-role client: there is no user JWT here for RLS to key off.
 */
export async function buildStoreContextForStore(
  db: SupabaseClient,
  storeId: string
): Promise<StoreContext | null> {
  const { data: stores } = await db
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .limit(1);
  const store = (stores?.[0] as StoreRow | undefined) ?? null;
  if (!store) return null;
  // The only caller is the admin's own automation endpoint (CRON_SECRET
  // gated) — always the owner asking about their own store, so always true.
  return buildContextForResolvedStore(db, store, true);
}

function euros(cents: number): string {
  return `€${Math.round(cents / 100).toLocaleString("fr-FR")}`;
}

/** Enough of a caption to recognise the post, never the whole thing. */
function excerpt(caption: string): string {
  const line = caption.split("\n").find((l) => l.trim().length > 0) ?? "";
  const clean = line.trim();
  return clean.length > 70 ? `${clean.slice(0, 70)}…` : clean;
}

/** How many posts the AI sees — enough to spot a pattern, not enough to drown. */
const MAX_SOCIAL_POSTS = 12;

/**
 * The social block, written so the AI can compare posts with each other but
 * cannot claim one produced a sale. That boundary is the whole point: views and
 * revenue are measured by different systems, and the only bridge between them
 * is a tracking code the merchant has to put in the caption themselves. Stating
 * the gap explicitly is what stops a plausible-sounding fabrication.
 */
export function formatSocialContext(social: SocialOverview): string[] {
  if (!social.connected) {
    return [
      "\nRÉSEAUX SOCIAUX : aucun compte social connecté. N'avance aucun chiffre de vues, de portée ou d'audience.",
    ];
  }
  if (social.posts.length === 0) {
    return [
      "\nRÉSEAUX SOCIAUX : compte connecté, mais aucune publication trouvée.",
    ];
  }

  const t = social.totals;
  const lines = [
    `\nRÉSEAUX SOCIAUX — Instagram, ${social.postLimit} dernières publications (valeurs réelles) :`,
    `${t.posts} publication(s) dont ${t.reels} Reel(s) — ${t.views} vue(s), ${t.reach} compte(s) touché(s), ${t.likes} like(s).`,
  ];

  for (const p of social.posts.slice(0, MAX_SOCIAL_POSTS)) {
    const visits =
      p.visits == null
        ? "aucun lien de suivi"
        : `${p.visits} visite(s) via le lien ${p.trackingCode}`;
    lines.push(
      `- ${p.date} · ${p.isReel ? "Reel" : "Post"} · ${p.views} vues, ${p.reach} touchés, ${p.likes} likes, engagement ${p.engagementRate}% · « ${excerpt(p.caption)} » · ${visits}`
    );
  }

  if (social.attribution.postsWithoutCode > 0) {
    lines.push(
      `ATTRIBUTION : ${social.attribution.postsWithoutCode} publication(s) sur ${t.posts} ne portent aucun lien de suivi. Pour celles-là il est IMPOSSIBLE de savoir combien de visiteurs ou de ventes elles ont amenés — ne relie jamais ces publications à un chiffre d'affaires, même approximatif. Tu peux en revanche les comparer entre elles (vues, portée, engagement) et recommander d'ajouter un lien « ?a=CODE » distinct dans chaque légende pour rendre l'attribution mesurable.`
    );
  }

  return lines;
}

function formatRealContext(
  store: StoreRow,
  products: ProductRow[],
  campaigns: CampaignRow[],
  metrics: MetricDailyRow[],
  social: SocialOverview
): string {
  const lines: string[] = [`Boutique : ${store.name} (devise ${store.currency})`];

  // Real store totals so the AI reasons on actual numbers (and knows when a
  // value is genuinely zero vs simply missing).
  const totalRev = metrics.reduce((t, m) => t + (m.revenue_cents || 0), 0);
  const totalOrders = metrics.reduce((t, m) => t + (m.orders || 0), 0);
  const totalVisitors = metrics.reduce((t, m) => t + (m.visitors || 0), 0);
  lines.push(
    `\nACTIVITÉ RÉELLE : ${totalOrders} commande(s), ${euros(totalRev)} de CA, ${totalVisitors} visiteur(s) sur ${metrics.length} jour(s) de données enregistrées.`
  );
  if (metrics.length === 0) {
    lines.push(
      "Aucune donnée de trafic ni de ventes enregistrée pour l'instant (boutique récemment connectée et/ou Google Analytics sans trafic). N'invente pas de chiffres de trafic, de CA ou de tendance."
    );
  }

  lines.push("\nPRODUITS (valeurs réelles) :");
  for (const p of products) {
    const base = `- ${p.name} : prix ${euros(p.price_cents)}, stock ${p.stock} unités, ${p.sales} vente(s), conversion ${p.conversion}%`;
    // Only state a trend when real sales movement backs it — otherwise the
    // DB default ("up") would be a fabricated signal.
    lines.push(
      p.sales > 0
        ? `${base}, tendance ${p.trend} ${p.delta ?? ""}`
        : `${base} (aucune vente encore — pas de tendance fiable)`
    );
  }

  if (campaigns.length) {
    lines.push("\nCAMPAGNES MARKETING :");
    for (const c of campaigns) {
      lines.push(
        `- ${c.channel} (${c.status}) : dépense ${euros(c.spend_cents)}, revenu ${euros(c.revenue_cents)}, ROAS ${c.roas}`
      );
    }
  }

  lines.push(...formatSocialContext(social));

  if (metrics.length) {
    lines.push("\nMÉTRIQUES QUOTIDIENNES (récent → ancien) :");
    for (const m of metrics) {
      lines.push(
        `- ${m.date} : CA ${euros(m.revenue_cents)}, ${m.orders} commandes, ${m.visitors} visiteurs, conv ${m.conversion}%`
      );
    }
  }

  return lines.join("\n");
}

function formatDemoContext(): string {
  const day = RANGE_DATA.day;
  const lines: string[] = [
    `Boutique : ${STORE.name} — ${STORE.tagline}`,
    "\nKPI DU JOUR :",
  ];
  for (const k of day.kpis) {
    lines.push(`- ${k.label} : ${k.value} (${k.delta} ${k.sub})`);
  }

  lines.push("\nPRODUITS :");
  for (const p of PRODUCTS) {
    lines.push(
      `- ${p.name} : ${p.revenue} de CA (${p.revenueShare}% du total), ${p.sales} ventes, conv ${p.conversion}, stock ${p.stock}, tendance ${p.trend} ${p.delta}`
    );
  }

  lines.push("\nCAMPAGNES MARKETING :");
  for (const c of CAMPAIGNS) {
    lines.push(
      `- ${c.channel} (${c.status}) : dépense ${c.spend}, revenu ${c.revenue}, ROAS ${c.roas}, tendance ${c.trend} ${c.delta}`
    );
  }

  lines.push(
    "\nTUNNEL DE CONVERSION :",
    day.funnel.map((f) => `- ${f.label} : ${f.value} (${f.pct}%)`).join("\n")
  );

  return lines.join("\n");
}
