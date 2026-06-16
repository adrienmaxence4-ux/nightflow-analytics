import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  parseMetric,
} from "@/utils/format";

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
