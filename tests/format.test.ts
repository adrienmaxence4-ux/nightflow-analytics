import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  parseMetric,
} from "@/utils/format";
import { formatEuro } from "@/lib/plans";

describe("format utils", () => {
  it("parses metric strings back to numbers", () => {
    expect(parseMetric("€48,920")).toBe(48920);
    expect(parseMetric("1,284")).toBe(1284);
    expect(parseMetric("2.10%")).toBe(210);
    expect(parseMetric("n/a")).toBe(0);
  });

  it("formats numbers with locale grouping", () => {
    expect(formatNumber(1284)).toMatch(/1.284/);
  });

  it("formats currency without decimals", () => {
    const out = formatCurrency(7840);
    expect(out).toContain("7");
    expect(out).toContain("€");
  });

  it("formats compact numbers", () => {
    expect(formatCompact(1280000).toLowerCase()).toMatch(/m|1,3|1.3/);
  });
});

describe("formatEuro", () => {
  it("n'ajoute pas de décimales à un montant rond", () => {
    expect(formatEuro(0)).toBe("€0");
    expect(formatEuro(900)).toBe("€9");
    expect(formatEuro(1900)).toBe("€19");
  });

  it("utilise la virgule décimale française, pas le point", () => {
    // Régression : toFixed(2) renvoie une chaîne, sur laquelle
    // toLocaleString("fr-FR") est un no-op — on sortait « €7.50 ».
    expect(formatEuro(750)).toBe("€7,50");
    expect(formatEuro(1583)).toBe("€15,83");
  });

  it("sépare les milliers", () => {
    expect(formatEuro(482000)).toMatch(/^€4\s?820$/u);
  });
});
