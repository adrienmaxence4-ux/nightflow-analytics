import { createClient } from "@/lib/supabase/server";
import { CAMPAIGNS, PRODUCTS, RANGE_DATA, STORE } from "@/services/mock/data";
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
          .limit(1);
        const store = (stores?.[0] as StoreRow | undefined) ?? null;
        if (store) {
          const [products, campaigns, metrics] = await Promise.all([
            supabase.from("products").select("*").eq("store_id", store.id),
            supabase.from("campaigns").select("*").eq("store_id", store.id),
            supabase
              .from("metrics_daily")
              .select("*")
              .eq("store_id", store.id)
              .order("date", { ascending: false })
              .limit(14),
          ]);
          const prods = (products.data as ProductRow[] | null) ?? [];
          if (prods.length > 0) {
            return {
              storeName: store.name,
              source: "db",
              storeId: store.id,
              summary: formatRealContext(
                store,
                prods,
                (campaigns.data as CampaignRow[] | null) ?? [],
                (metrics.data as MetricDailyRow[] | null) ?? []
              ),
            };
          }
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

function euros(cents: number): string {
  return `€${Math.round(cents / 100).toLocaleString("fr-FR")}`;
}

function formatRealContext(
  store: StoreRow,
  products: ProductRow[],
  campaigns: CampaignRow[],
  metrics: MetricDailyRow[]
): string {
  const lines: string[] = [`Boutique : ${store.name} (devise ${store.currency})`];

  lines.push("\nPRODUITS :");
  for (const p of products) {
    lines.push(
      `- ${p.name} : prix ${euros(p.price_cents)}, stock ${p.stock}, conversion ${p.conversion}%, tendance ${p.trend} ${p.delta ?? ""}`
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
