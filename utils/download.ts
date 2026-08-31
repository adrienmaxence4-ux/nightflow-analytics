/**
 * Client-side file download helpers. No dependencies — builds a Blob and
 * clicks a transient <a download> link, so it works in any modern browser.
 */

export function downloadBlob(
  filename: string,
  content: string | Blob,
  mime = "text/plain;charset=utf-8"
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Escapes a single CSV field: RFC-4180 quoting, plus formula-injection
 * neutralisation — a value starting with `= + - @` or a control blank is
 * prefixed with `'` so Excel/Sheets/LibreOffice treat it as text, not a formula
 * (product/campaign names come from the connected store).
 */
function csvField(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV string from headers + rows. Prefixes a BOM for Excel/UTF-8. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvField).join(","));
  return "﻿" + lines.join("\r\n");
}

/** YYYY-MM-DD for filenames. */
export function dateStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
