import { downloadBlob, toCsv, dateStamp } from "@/utils/download";
import type {
  Campaign,
  Insight,
  Kpi,
  Product,
  RangeData,
  Recommendation,
} from "@/types";

/**
 * CLIENT-SIDE report & export service.
 *
 * Pulls the user's REAL data from the API routes (dashboard, products,
 * marketing, insights — each falls back to the MoonStore mock server-side) and
 * turns it into downloadable artefacts: a branded HTML report (printable to
 * PDF) and CSV exports. No external dependencies.
 */

interface ReportData {
  source: "db" | "mock";
  range: RangeData;
  products: Product[];
  campaigns: Campaign[];
  insights: Insight[];
  recommendations: Recommendation[];
  summary: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as T;
  } catch {
    /* ignore */
  }
  return null;
}

async function collect(): Promise<ReportData> {
  const [dash, prod, mkt, ins] = await Promise.all([
    getJson<{ source: "db" | "mock"; data: RangeData }>(
      "/api/dashboard?range=month"
    ),
    getJson<{ source: "db" | "mock"; products: Product[] }>("/api/products"),
    getJson<{ campaigns: Campaign[] }>("/api/marketing"),
    getJson<{
      insights?: Insight[];
      recommendations?: Recommendation[];
      summary?: string;
    }>("/api/insights"),
  ]);

  return {
    source: dash?.source ?? prod?.source ?? "mock",
    range: dash?.data ?? ({ sub: "", kpis: [], series: [], funnel: [], bars: [] } as RangeData),
    products: prod?.products ?? [],
    campaigns: mkt?.campaigns ?? [],
    insights: ins?.insights ?? [],
    recommendations: ins?.recommendations ?? [],
    summary: ins?.summary ?? "",
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

function kpiCards(kpis: Kpi[]): string {
  if (!kpis.length) return "<p class='muted'>Aucune donnée KPI.</p>";
  return kpis
    .map(
      (k) => `<div class="kpi">
        <div class="kpi-label">${esc(k.label)}</div>
        <div class="kpi-value">${esc(k.value)}</div>
        <div class="kpi-delta ${k.dir}">${k.dir === "up" ? "▲" : "▼"} ${esc(k.delta)} · ${esc(k.sub)}</div>
        <div class="kpi-insight">${esc(k.insight)}</div>
      </div>`
    )
    .join("");
}

function productRows(products: Product[]): string {
  if (!products.length)
    return "<tr><td colspan='5' class='muted'>Aucun produit synchronisé.</td></tr>";
  return products
    .map(
      (p) => `<tr>
        <td>${esc(p.icon)} ${esc(p.name)}</td>
        <td>${p.sales}</td>
        <td>${esc(p.revenue)}</td>
        <td>${esc(p.conversion)}</td>
        <td>${esc(p.delta || "—")}</td>
      </tr>`
    )
    .join("");
}

function campaignRows(campaigns: Campaign[]): string {
  if (!campaigns.length)
    return "<tr><td colspan='4' class='muted'>Aucune campagne.</td></tr>";
  return campaigns
    .map(
      (c) => `<tr>
        <td>${esc(c.logo)} ${esc(c.channel)}</td>
        <td>${esc(c.spend)}</td>
        <td>${esc(c.revenue)}</td>
        <td>${c.roas.toFixed(1)}×</td>
      </tr>`
    )
    .join("");
}

function insightItems(insights: Insight[]): string {
  if (!insights.length) return "<li class='muted'>Aucun insight pour l'instant.</li>";
  return insights
    .map(
      (i) =>
        `<li><b>${esc(i.what)}</b><br/><span class="muted">Pourquoi : ${esc(i.why)}</span><br/>→ ${esc(i.action)}</li>`
    )
    .join("");
}

function buildHtml(d: ReportData): string {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const store = d.range.sub || "Votre boutique";
  const banner =
    d.source === "mock"
      ? `<div class="demo">⚠️ Données de démonstration (aucune boutique connectée avec des ventes réelles).</div>`
      : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/>
<title>Nightflow — Rapport ${esc(dateStamp())}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    margin: 0; background: #0b1020; color: #1a1f36; }
  .page { max-width: 880px; margin: 0 auto; background: #fff; }
  .hero { background: linear-gradient(115deg,#1a1340,#0b1733); color: #fff; padding: 40px 48px; }
  .brand { font-weight: 800; letter-spacing: .14em; font-size: 13px; color: #6ad9ff; }
  h1 { margin: 8px 0 4px; font-size: 28px; }
  .sub { color: #b9c4e6; font-size: 14px; }
  .body { padding: 32px 48px 48px; }
  h2 { font-size: 16px; margin: 32px 0 14px; border-bottom: 2px solid #ece9ff; padding-bottom: 8px; }
  .demo { background: #fff4d6; color: #7a5b00; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 16px; }
  .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .kpi { border: 1px solid #ece9ff; border-radius: 12px; padding: 14px 16px; }
  .kpi-label { font-size: 12px; color: #6b7394; }
  .kpi-value { font-size: 24px; font-weight: 800; margin: 2px 0; }
  .kpi-delta { font-size: 12px; font-weight: 700; }
  .kpi-delta.up { color: #0a9d5a; } .kpi-delta.down { color: #d23b6e; }
  .kpi-insight { font-size: 12px; color: #6b7394; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #6b7394; font-size: 11px; letter-spacing: .04em;
    border-bottom: 1px solid #ece9ff; padding: 8px; }
  td { padding: 9px 8px; border-bottom: 1px solid #f3f1ff; }
  ul { padding-left: 18px; } li { margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
  .muted { color: #9aa1bd; }
  .summary { background: #f6f4ff; border-radius: 12px; padding: 16px 18px; font-size: 14px; line-height: 1.6; }
  .foot { padding: 20px 48px 40px; color: #9aa1bd; font-size: 11px; }
  @media print { body { background: #fff; } .page { max-width: none; } }
</style></head>
<body><div class="page">
  <div class="hero">
    <div class="brand">✦ NIGHTFLOW ANALYTICS</div>
    <h1>Rapport de performance</h1>
    <div class="sub">${esc(store)} · généré le ${esc(today)}</div>
    ${banner}
  </div>
  <div class="body">
    ${d.summary ? `<h2>Synthèse du Copilot</h2><div class="summary">${esc(d.summary)}</div>` : ""}

    <h2>Indicateurs clés (30 derniers jours)</h2>
    <div class="kpis">${kpiCards(d.range.kpis)}</div>

    <h2>Produits</h2>
    <table><thead><tr><th>Produit</th><th>Ventes</th><th>Revenu</th><th>Conv.</th><th>Tendance</th></tr></thead>
    <tbody>${productRows(d.products)}</tbody></table>

    <h2>Canaux marketing</h2>
    <table><thead><tr><th>Canal</th><th>Dépenses</th><th>Revenu</th><th>ROAS</th></tr></thead>
    <tbody>${campaignRows(d.campaigns)}</tbody></table>

    <h2>Insights & recommandations</h2>
    <ul>${insightItems(d.insights)}</ul>
  </div>
  <div class="foot">Rapport généré automatiquement par Nightflow Analytics — votre directeur e-commerce IA.</div>
</div></body></html>`;
}

/**
 * Generates a branded HTML report from the store's real data and downloads it.
 * The file opens in any browser and can be printed / saved as PDF.
 */
export async function generateStoreReport(): Promise<{ source: "db" | "mock" }> {
  const data = await collect();
  downloadBlob(
    `nightflow-rapport-${dateStamp()}.html`,
    buildHtml(data),
    "text/html;charset=utf-8"
  );
  return { source: data.source };
}

/** Exports the given products as a CSV file. */
export function exportProductsCsv(products: Product[]): void {
  const rows = products.map((p) => [
    p.name,
    p.sales,
    p.revenue,
    p.conversion,
    `${p.revenueShare}%`,
    p.stock,
    p.delta || "",
  ]);
  const csv = toCsv(
    ["Produit", "Ventes", "Revenu", "Conversion", "Part du CA", "Stock", "Tendance"],
    rows
  );
  downloadBlob(`nightflow-produits-${dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

/** Exports the given campaigns as a CSV file. */
export function exportCampaignsCsv(campaigns: Campaign[]): void {
  const rows = campaigns.map((c) => [
    c.channel,
    c.status,
    c.spend,
    c.revenue,
    `${c.roas.toFixed(2)}x`,
  ]);
  const csv = toCsv(
    ["Canal", "Statut", "Dépenses", "Revenu", "ROAS"],
    rows
  );
  downloadBlob(`nightflow-campagnes-${dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
}
