import { downloadBlob, toCsv, dateStamp } from "@/utils/download";
import type { jsPDF } from "jspdf";
import type {
  Campaign,
  Insight,
  Product,
  RangeData,
  Recommendation,
} from "@/types";

/**
 * CLIENT-SIDE report & export service.
 *
 * Pulls the user's REAL data from the API routes (dashboard, products,
 * marketing, insights — each falls back to the MoonStore mock server-side) and
 * turns it into downloadable artefacts: a branded PDF report, an Excel
 * workbook, a Word document and CSV exports. jsPDF, xlsx and docx are all
 * dynamically imported so each ships in its own chunk (browser-only).
 *
 * The three formats deliberately don't share one table definition: the PDF is
 * ASCII-only (its built-in Helvetica has no accents) and each format shows the
 * columns that fit it — the workbook the widest, the PDF the narrowest.
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
    range:
      dash?.data ??
      ({ sub: "", kpis: [], series: [], funnel: [], bars: [] } as RangeData),
    products: prod?.products ?? [],
    campaigns: mkt?.campaigns ?? [],
    insights: ins?.insights ?? [],
    recommendations: ins?.recommendations ?? [],
    summary: ins?.summary ?? "",
  };
}

/** Store name + date, as shown at the top of the PDF and the Word document. */
function heading(data: ReportData) {
  return {
    store: (data.range.sub || "Votre boutique").split(" · ")[0],
    today: new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

/** Same three KPI columns in every format. */
const kpiRows = (data: ReportData): string[][] =>
  data.range.kpis.map((k) => [k.label, k.value, `${k.delta} ${k.sub}`]);

// ─────────────────────────────────────────────────────────────
// PDF report
// ─────────────────────────────────────────────────────────────

type Doc = jsPDF;
// jsPDF augments its instance with lastAutoTable after a table is drawn.
type WithAutoTable = { lastAutoTable?: { finalY: number } };

/** Page geometry plus the vertical cursor the drawing steps advance. */
interface Layout {
  pageW: number;
  pageH: number;
  margin: number;
  contentW: number;
  y: number;
}

const LINE_H = 5;

function drawHeaderBand(doc: Doc, l: Layout, data: ReportData): void {
  const { store, today } = heading(data);
  doc.setFillColor(16, 19, 40);
  doc.rect(0, 0, l.pageW, 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 210, 255);
  doc.text("NIGHTFLOW ANALYTICS", l.margin, 13);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Rapport de performance", l.margin, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(185, 196, 230);
  doc.text(`${store} - genere le ${today}`, l.margin, 30);
}

function drawMockBanner(doc: Doc, l: Layout): void {
  doc.setFillColor(255, 244, 214);
  doc.rect(l.margin, l.y - 5, l.contentW, 9, "F");
  doc.setTextColor(122, 91, 0);
  doc.setFontSize(9);
  doc.text(
    "Donnees de demonstration (aucune boutique connectee avec des ventes reelles).",
    l.margin + 3,
    l.y + 1
  );
  l.y += 12;
}

/** Section heading, starting a new page when there's no room left for one. */
function drawSectionTitle(doc: Doc, l: Layout, label: string): void {
  if (l.y > l.pageH - 30) {
    doc.addPage();
    l.y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 20, 64);
  doc.text(label, l.margin, l.y);
  doc.setDrawColor(220, 215, 245);
  doc.line(l.margin, l.y + 2, l.margin + l.contentW, l.y + 2);
  l.y += 9;
}

function drawSummary(doc: Doc, l: Layout, summary: string): void {
  drawSectionTitle(doc, l, "Synthese du Copilot");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(45, 48, 64);
  const lines = doc.splitTextToSize(summary, l.contentW);
  doc.text(lines, l.margin, l.y);
  l.y += lines.length * LINE_H + 6;
}

/** One insight block: what (bold) / why (muted) / action. */
function drawInsight(doc: Doc, l: Layout, insight: Insight): void {
  const wrap = (text: string) => doc.splitTextToSize(text, l.contentW);
  const what = wrap(`- ${insight.what}`);
  const why = wrap(`  Pourquoi : ${insight.why}`);
  const action = wrap(`  -> ${insight.action}`);

  const height = (what.length + why.length + action.length) * LINE_H;
  if (l.y + height > l.pageH - 18) {
    doc.addPage();
    l.y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 20, 64);
  doc.text(what, l.margin, l.y);
  l.y += what.length * LINE_H;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 115, 140);
  doc.text(why, l.margin, l.y);
  l.y += why.length * LINE_H;

  doc.setTextColor(40, 44, 60);
  doc.text(action, l.margin, l.y);
  l.y += action.length * LINE_H + 4;
}

function drawFooterOnEveryPage(doc: Doc, l: Layout): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 155, 180);
    doc.text(
      "Genere automatiquement par Nightflow Analytics - votre directeur e-commerce IA.",
      l.margin,
      l.pageH - 8
    );
    doc.text(`${i} / ${pages}`, l.pageW - l.margin, l.pageH - 8, {
      align: "right",
    });
  }
}

/**
 * Generates a branded PDF report from the store's real data and downloads it.
 */
export async function generateStoreReport(): Promise<{ source: "db" | "mock" }> {
  const data = await collect();
  const { jsPDF: JsPdf } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new JsPdf({ unit: "mm", format: "a4" });
  const margin = 14;
  const l: Layout = {
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
    margin,
    contentW: doc.internal.pageSize.getWidth() - margin * 2,
    y: 44,
  };

  const tableStyle = {
    margin: { left: margin, right: margin },
    theme: "striped" as const,
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [40, 44, 60] as [number, number, number],
    },
    headStyles: {
      fillColor: [26, 20, 64] as [number, number, number],
      textColor: 255,
      fontStyle: "bold" as const,
    },
    alternateRowStyles: {
      fillColor: [246, 244, 255] as [number, number, number],
    },
  };

  /** Draws a section title + its table, then parks the cursor below it. */
  const section = (label: string, head: string[], body: string[][]): void => {
    drawSectionTitle(doc, l, label);
    autoTable(doc, { ...tableStyle, startY: l.y, head: [head], body });
    l.y = ((doc as unknown as WithAutoTable).lastAutoTable?.finalY ?? l.y) + 9;
  };

  drawHeaderBand(doc, l, data);
  if (data.source === "mock") drawMockBanner(doc, l);
  if (data.summary) drawSummary(doc, l, data.summary);

  const kpis = kpiRows(data);
  section(
    "Indicateurs cles (30 derniers jours)",
    ["Indicateur", "Valeur", "Evolution"],
    kpis.length ? kpis : [["Aucune donnee", "-", "-"]]
  );

  section(
    "Produits",
    ["Produit", "Ventes", "Revenu", "Conv.", "Tendance"],
    data.products.length
      ? data.products.map((p) => [
          p.name,
          String(p.sales),
          p.revenue,
          p.conversion,
          p.delta || "-",
        ])
      : [["Aucun produit synchronise", "-", "-", "-", "-"]]
  );

  section(
    "Canaux marketing",
    ["Canal", "Depenses", "Revenu", "ROAS"],
    data.campaigns.length
      ? data.campaigns.map((c) => [
          c.channel,
          c.spend,
          c.revenue,
          `${c.roas.toFixed(1)}x`,
        ])
      : [["Aucune campagne", "-", "-", "-"]]
  );

  drawSectionTitle(doc, l, "Insights & recommandations");
  doc.setFontSize(10);
  if (data.insights.length) {
    for (const insight of data.insights) drawInsight(doc, l, insight);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 155, 180);
    doc.text("Aucun insight pour l'instant.", l.margin, l.y);
    l.y += 6;
  }

  drawFooterOnEveryPage(doc, l);

  doc.save(`nightflow-rapport-${dateStamp()}.pdf`);
  return { source: data.source };
}

// ─────────────────────────────────────────────────────────────
// Excel (.xlsx) report — same data, one sheet per section.
// ─────────────────────────────────────────────────────────────
export async function generateStoreReportExcel(): Promise<{ source: "db" | "mock" }> {
  const data = await collect();
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();
  const sheet = (name: string, rows: (string | number)[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Reasonable column widths from the longest cell per column.
    ws["!cols"] = rows[0].map((_, c) => ({
      wch: Math.min(
        60,
        Math.max(...rows.map((r) => String(r[c] ?? "").length), 10) + 2
      ),
    }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  sheet("Synthèse", [
    ["Nightflow Analytics — Rapport de performance"],
    [`Généré le ${new Date().toLocaleDateString("fr-FR")}`],
    data.source === "mock" ? ["⚠ Données de démonstration"] : [""],
    [""],
    ["Synthèse du Copilot"],
    [data.summary || "—"],
  ]);

  sheet("KPIs", [["Indicateur", "Valeur", "Évolution"], ...kpiRows(data)]);

  sheet("Produits", [
    ["Produit", "Ventes", "Revenu", "Conversion", "Part du CA", "Stock", "Tendance"],
    ...data.products.map((p): (string | number)[] => [
      p.name,
      p.sales,
      p.revenue,
      p.conversion,
      `${p.revenueShare}%`,
      p.stock,
      p.delta || "—",
    ]),
  ]);

  sheet("Marketing", [
    ["Canal", "Statut", "Dépenses", "Revenu", "ROAS"],
    ...data.campaigns.map((c): (string | number)[] => [
      c.channel,
      c.status,
      c.spend,
      c.revenue,
      `${c.roas.toFixed(2)}x`,
    ]),
  ]);

  sheet("Insights", [
    ["Constat", "Pourquoi", "Action recommandée", "Impact"],
    ...data.insights.map((i): (string | number)[] => [
      i.what,
      i.why,
      i.action,
      i.impact || "—",
    ]),
  ]);

  XLSX.writeFile(wb, `nightflow-rapport-${dateStamp()}.xlsx`);
  return { source: data.source };
}

// ─────────────────────────────────────────────────────────────
// Word (.docx) report — same data, print-friendly document.
// ─────────────────────────────────────────────────────────────
export async function generateStoreReportWord(): Promise<{ source: "db" | "mock" }> {
  const data = await collect();
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
  } = await import("docx");

  const { store, today } = heading(data);

  const h = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 120 },
    });
  const p = (text: string, opts?: { bold?: boolean; color?: string }) =>
    new Paragraph({
      children: [new TextRun({ text, bold: opts?.bold, color: opts?.color })],
      spacing: { after: 80 },
    });
  const table = (head: string[], rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: head.map(
            (t) =>
              new TableCell({
                shading: { fill: "1A1440" },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })],
                  }),
                ],
              })
          ),
        }),
        ...rows.map(
          (r) =>
            new TableRow({
              children: r.map(
                (t) => new TableCell({ children: [new Paragraph(String(t))] })
              ),
            })
        ),
      ],
    });

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      children: [
        new TextRun({ text: "NIGHTFLOW ANALYTICS", bold: true, color: "3D8FD2" }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: "Rapport de performance", bold: true, size: 48 })],
      spacing: { after: 60 },
    }),
    p(`${store} — généré le ${today}`, { color: "666688" }),
  ];

  if (data.source === "mock") {
    children.push(
      p(
        "⚠ Données de démonstration (aucune boutique connectée avec des ventes réelles).",
        { color: "7A5B00" }
      )
    );
  }

  if (data.summary) {
    children.push(h("Synthèse du Copilot"), p(data.summary));
  }

  children.push(
    h("Indicateurs clés (30 derniers jours)"),
    table(
      ["Indicateur", "Valeur", "Évolution"],
      kpiRows(data).length ? kpiRows(data) : [["Aucune donnée", "—", "—"]]
    ),
    h("Produits"),
    table(
      ["Produit", "Ventes", "Revenu", "Conv.", "Stock"],
      data.products.length
        ? data.products.map((pr) => [
            pr.name,
            String(pr.sales),
            pr.revenue,
            pr.conversion,
            String(pr.stock),
          ])
        : [["Aucun produit synchronisé", "—", "—", "—", "—"]]
    ),
    h("Canaux marketing"),
    table(
      ["Canal", "Dépenses", "Revenu", "ROAS"],
      data.campaigns.length
        ? data.campaigns.map((c) => [
            c.channel,
            c.spend,
            c.revenue,
            `${c.roas.toFixed(1)}x`,
          ])
        : [["Aucune campagne", "—", "—", "—"]]
    ),
    h("Insights & recommandations")
  );

  if (data.insights.length) {
    for (const insight of data.insights) {
      children.push(
        p(`• ${insight.what}`, { bold: true }),
        p(`Pourquoi : ${insight.why}`, { color: "555577" }),
        p(`→ ${insight.action}`)
      );
    }
  } else {
    children.push(p("Aucun insight pour l'instant."));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(
    `nightflow-rapport-${dateStamp()}.docx`,
    blob,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  return { source: data.source };
}

export type ReportFormat = "pdf" | "xlsx" | "docx";

/** Generates + downloads the report in the chosen format. */
export async function generateStoreReportFile(
  format: ReportFormat
): Promise<{ source: "db" | "mock" }> {
  if (format === "xlsx") return generateStoreReportExcel();
  if (format === "docx") return generateStoreReportWord();
  return generateStoreReport();
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
  const csv = toCsv(["Canal", "Statut", "Dépenses", "Revenu", "ROAS"], rows);
  downloadBlob(`nightflow-campagnes-${dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
}
