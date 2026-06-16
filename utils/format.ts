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
