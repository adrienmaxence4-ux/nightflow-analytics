/** Formatting helpers. */

export function formatNumber(n: number, locale = "fr-FR"): string {
  return n.toLocaleString(locale);
}

export function formatCurrency(n: number, currency = "EUR", locale = "fr-FR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCompact(n: number, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, { notation: "compact" }).format(n);
}

/** Parse a "€48,920" / "1,284" style string back to a number. */
export function parseMetric(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}

/** Human-friendly relative time in French ("il y a 5 min", "hier", …). */
export function timeAgo(iso: string, locale = "fr-FR"): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const min = Math.round((Date.now() - then) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString(locale);
}
