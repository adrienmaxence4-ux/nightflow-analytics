import { describe, expect, it } from "vitest";
import {
  askCopilot,
  getAnalysisCards,
  getGroupedInsights,
  getInsightSummary,
} from "@/services/copilot.service";

describe("copilot service", () => {
  it("returns a stock answer when asked about stock", async () => {
    const a = await askCopilot("Quels produits sont en rupture de stock ?");
    expect(a.toLowerCase()).toContain("stock");
  });

  it("returns a mobile/conversion answer", async () => {
    const a = await askCopilot("Comment améliorer ma conversion mobile ?");
    expect(a.toLowerCase()).toMatch(/mobile|conversion|checkout/);
  });

  it("always returns a non-empty string", async () => {
    const a = await askCopilot("bonjour");
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(0);
  });

  it("groups insights by lens and counts them", () => {
    const g = getGroupedInsights();
    const s = getInsightSummary();
    expect(g.risks.length).toBe(s.risks);
    expect(g.alerts.length).toBe(s.alerts);
    expect(g.opportunities.length).toBe(s.opportunities);
    expect(s.risks + s.alerts + s.opportunities).toBeGreaterThan(0);
  });

  it("exposes the four analysis cards", () => {
    const cards = getAnalysisCards();
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.category).sort()).toEqual([
      "forecast",
      "marketing",
      "products",
      "sales",
    ]);
  });
});
