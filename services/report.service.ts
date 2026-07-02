import { downloadBlob, toCsv, dateStamp } from "@/utils/download";
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
 * turns it into downloadable artefacts: a branded PDF report and CSV exports.
 * jsPDF is dynamically imported so it ships in its own chunk (browser-only).
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

// jsPDF augments its instance with lastAutoTable after a table is drawn.
type WithAutoTable = { lastAutoTable?: { finalY: number } };

/**
 * Generates a branded PDF report from the store's real data and downloads it.
 */
export async function generateStoreReport(): Promise<{ source: "db" | "mock" }> {
  const data = await collect();
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const store = (data.range.sub || "Votre boutique").split(" · ")[0];
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Header band ──
  doc.setFillColor(16, 19, 40);
  doc.rect(0, 0, pageW, 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 210, 255);
  doc.text("NIGHTFLOW ANALYTICS", margin, 13);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Rapport de performance", margin, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(185, 196, 230);
  doc.text(`${store} - genere le ${today}`, margin, 30);

  let y = 44;

  if (data.source === "mock") {
    doc.setFillColor(255, 244, 214);
    doc.rect(margin, y - 5, contentW, 9, "F");
    doc.setTextColor(122, 91, 0);
    doc.setFontSize(9);
    doc.text(
      "Donnees de demonstration (aucune boutique connectee avec des ventes reelles).",
      margin + 3,
      y + 1
    );
    y += 12;
  }

  const sectionTitle = (label: string): void => {
    if (y > pageH - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(26, 20, 64);
    doc.text(label, margin, y);
    doc.setDrawColor(220, 215, 245);
    doc.line(margin, y + 2, margin + contentW, y + 2);
    y += 9;
  };

  const tableStyle = {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped" as const,
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [40, 44, 60] as [number, number, number] },
    headStyles: { fillColor: [26, 20, 64] as [number, number, number], textColor: 255, fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: [246, 244, 255] as [number, number, number] },
  };

  const advanceAfterTable = (): void => {
    y = ((doc as unknown as WithAutoTable).lastAutoTable?.finalY ?? y) + 9;
  };

  // ── Summary ──
  if (data.summary) {
    sectionTitle("Synthese du Copilot");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(45, 48, 64);
    const lines = doc.splitTextToSize(data.summary, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  // ── KPIs ──
  sectionTitle("Indicateurs cles (30 derniers jours)");
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Indicateur", "Valeur", "Evolution"]],
    body: data.range.kpis.length
      ? data.range.kpis.map((k) => [k.label, k.value, `${k.delta} ${k.sub}`])
      : [["Aucune donnee", "-", "-"]],
  });
  advanceAfterTable();

  // ── Products ──
  sectionTitle("Produits");
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Produit", "Ventes", "Revenu", "Conv.", "Tendance"]],
    body: data.products.length
      ? data.products.map((p) => [
          p.name,
          String(p.sales),
          p.revenue,
          p.conversion,
          p.delta || "-",
        ])
      : [["Aucun produit synchronise", "-", "-", "-", "-"]],
  });
  advanceAfterTable();

  // ── Campaigns ──
  sectionTitle("Canaux marketing");
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Canal", "Depenses", "Revenu", "ROAS"]],
    body: data.campaigns.length
      ? data.campaigns.map((c) => [
          c.channel,
          c.spend,
          c.revenue,
          `${c.roas.toFixed(1)}x`,
        ])
      : [["Aucune campagne", "-", "-", "-"]],
  });
  advanceAfterTable();

  // ── Insights ──
  sectionTitle("Insights & recommandations");
  doc.setFontSize(10);
  if (!data.insights.length) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 155, 180);
    doc.text("Aucun insight pour l'instant.", margin, y);
    y += 6;
  }
  for (const ins of data.insights) {
    const block = [
      ...doc.splitTextToSize(`- ${ins.what}`, contentW),
      ...doc.splitTextToSize(`  Pourquoi : ${ins.why}`, contentW),
      ...doc.splitTextToSize(`  -> ${ins.action}`, contentW),
    ];
    if (y + block.length * 5 > pageH - 18) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 20, 64);
    const whatLines = doc.splitTextToSize(`- ${ins.what}`, contentW);
    doc.text(whatLines, margin, y);
    y += whatLines.length * 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 115, 140);
    const whyLines = doc.splitTextToSize(`  Pourquoi : ${ins.why}`, contentW);
    doc.text(whyLines, margin, y);
    y += whyLines.length * 5;
    doc.setTextColor(40, 44, 60);
    const actLines = doc.splitTextToSize(`  -> ${ins.action}`, contentW);
    doc.text(actLines, margin, y);
    y += actLines.length * 5 + 4;
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 155, 180);
    doc.text(
      "Genere automatiquement par Nightflow Analytics - votre directeur e-commerce IA.",
      margin,
      pageH - 8
    );
    doc.text(`${i} / ${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }

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

  sheet("KPIs", [
    ["Indicateur", "Valeur", "Évolution"],
    ...data.range.kpis.map((k): (string | number)[] => [
      k.label,
      k.value,
      `${k.delta} ${k.sub}`,
    ]),
  ]);

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

  const store = (data.range.sub || "Votre boutique").split(" · ")[0];
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const h = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } });
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
    children.push(p("⚠ Données de démonstration (aucune boutique connectée avec des ventes réelles).", { color: "7A5B00" }));
  }

  if (data.summary) {
    children.push(h("Synthèse du Copilot"), p(data.summary));
  }

  children.push(
    h("Indicateurs clés (30 derniers jours)"),
    table(
      ["Indicateur", "Valeur", "Évolution"],
      data.range.kpis.length
        ? data.range.kpis.map((k) => [k.label, k.value, `${k.delta} ${k.sub}`])
        : [["Aucune donnée", "—", "—"]]
    ),
    h("Produits"),
    table(
      ["Produit", "Ventes", "Revenu", "Conv.", "Stock"],
      data.products.length
        ? data.products.map((pr) => [pr.name, String(pr.sales), pr.revenue, pr.conversion, String(pr.stock)])
        : [["Aucun produit synchronisé", "—", "—", "—", "—"]]
    ),
    h("Canaux marketing"),
    table(
      ["Canal", "Dépenses", "Revenu", "ROAS"],
      data.campaigns.length
        ? data.campaigns.map((c) => [c.channel, c.spend, c.revenue, `${c.roas.toFixed(1)}x`])
        : [["Aucune campagne", "—", "—", "—"]]
    ),
    h("Insights & recommandations")
  );

  if (data.insights.length) {
    for (const ins of data.insights) {
      children.push(
        p(`• ${ins.what}`, { bold: true }),
        p(`Pourquoi : ${ins.why}`, { color: "555577" }),
        p(`→ ${ins.action}`)
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
