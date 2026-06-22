import { describe, it, expect } from "vitest";
import {
  alertToInsight,
  alertToNotification,
  alertToRecommendation,
  detectAlerts,
  onboardingAlerts,
  type StoreSignals,
} from "@/services/alerts/detect";
import type {
  CampaignRow,
  MetricDailyRow,
  ProductRow,
} from "@/types/database";

let seq = 0;
const metric = (o: Partial<MetricDailyRow>): MetricDailyRow => ({
  id: `m-${seq++}`,
  store_id: "s1",
  date: "2026-06-01",
  revenue_cents: 0,
  orders: 0,
  visitors: 0,
  conversion: 0,
  created_at: "",
  ...o,
});
const product = (o: Partial<ProductRow>): ProductRow => ({
  id: `p-${seq++}`,
  store_id: "s1",
  external_id: null,
  name: "Produit",
  icon: null,
  price_cents: 5000,
  stock: 100,
  conversion: 2,
  trend: "up",
  delta: null,
  note: null,
  sales: 0,
  revenue_cents: 0,
  revenue_share: 0,
  created_at: "",
  updated_at: "",
  ...o,
});
const campaign = (o: Partial<CampaignRow>): CampaignRow => ({
  id: `c-${seq++}`,
  store_id: "s1",
  channel: "Meta Ads",
  status: "active",
  spend_cents: 0,
  revenue_cents: 0,
  roas: 0,
  trend: "up",
  delta: null,
  created_at: "",
  updated_at: "",
  ...o,
});
const signals = (o: Partial<StoreSignals>): StoreSignals => ({
  storeName: "Test",
  metrics: [],
  products: [],
  campaigns: [],
  connectedProviders: [],
  ...o,
});
/** N identical days (newest-first ordering is irrelevant when identical). */
const days = (n: number, o: Partial<MetricDailyRow>) =>
  Array.from({ length: n }, () => metric(o));

describe("detectAlerts — revenue", () => {
  it("flags a sharp revenue drop as critical", () => {
    const s = signals({
      metrics: [
        ...days(7, { revenue_cents: 50_000 }), // recent (low)
        ...days(7, { revenue_cents: 150_000 }), // previous (high)
      ],
    });
    const a = detectAlerts(s).find((x) => x.id === "rev-drop");
    expect(a).toBeDefined();
    expect(a?.severity).toBe("critical");
  });

  it("flags a revenue surge as positive", () => {
    const s = signals({
      metrics: [
        ...days(7, { revenue_cents: 150_000 }),
        ...days(7, { revenue_cents: 50_000 }),
      ],
    });
    expect(detectAlerts(s).some((x) => x.id === "rev-surge")).toBe(true);
  });
});

describe("detectAlerts — stock & sales", () => {
  it("flags an out-of-stock best-seller as critical", () => {
    const s = signals({
      products: [product({ stock: 0, sales: 12, price_cents: 4500 })],
      metrics: [metric({ orders: 5, revenue_cents: 22_500 })],
    });
    const a = detectAlerts(s).find((x) => x.id.startsWith("stock-out-"));
    expect(a?.severity).toBe("critical");
    expect(a?.impact).toContain("€");
  });

  it("flags traffic without any sales as a broken funnel", () => {
    const s = signals({
      products: [product({ sales: 0 })],
      metrics: [metric({ visitors: 500, orders: 0 })],
    });
    const a = detectAlerts(s).find((x) => x.id === "no-sales");
    expect(a?.severity).toBe("critical");
    expect(a?.body.toLowerCase()).toContain("visiteur");
  });
});

describe("detectAlerts — marketing", () => {
  it("flags an unprofitable campaign (ROAS < 1) as critical", () => {
    const s = signals({
      campaigns: [
        campaign({ spend_cents: 100_000, revenue_cents: 50_000, roas: 0.5 }),
      ],
    });
    const a = detectAlerts(s).find((x) => x.id.startsWith("roas-loss-"));
    expect(a?.severity).toBe("critical");
  });

  it("flags a strong campaign (ROAS >= 4) as a positive opportunity", () => {
    const s = signals({
      campaigns: [
        campaign({ spend_cents: 100_000, revenue_cents: 500_000, roas: 5 }),
      ],
    });
    const a = detectAlerts(s).find((x) => x.id.startsWith("roas-win-"));
    expect(a?.severity).toBe("positive");
  });
});

describe("detectAlerts — healthy store", () => {
  it("returns an all-clear positive when nothing is wrong", () => {
    const s = signals({
      metrics: days(14, {
        revenue_cents: 100_000,
        orders: 10,
        visitors: 1000,
        conversion: 2,
      }),
      products: [product({ stock: 100, sales: 50, revenue_share: 40 })],
    });
    const alerts = detectAlerts(s);
    expect(
      alerts.some((a) => a.severity === "critical" || a.severity === "warning")
    ).toBe(false);
    expect(alerts.some((a) => a.id === "all-clear")).toBe(true);
  });
});

describe("mappers produce valid shapes", () => {
  const [alert] = detectAlerts(
    signals({ campaigns: [campaign({ spend_cents: 100_000, revenue_cents: 10_000, roas: 0.1 })] })
  );

  it("maps to a Notification", () => {
    const n = alertToNotification(alert);
    expect(n).toMatchObject({ id: alert.id, title: alert.title, read: false });
    expect(n.time).toBeTruthy();
  });

  it("maps to an Insight (what/why/action)", () => {
    const i = alertToInsight(alert);
    expect(i.what).toBe(alert.title);
    expect(i.action).toBeTruthy();
    expect(i.impactScore).toBeGreaterThan(0);
  });

  it("maps to a Recommendation", () => {
    const r = alertToRecommendation(alert);
    expect(r.title).toBe(alert.title);
    expect(["high", "medium"]).toContain(r.impactLevel);
  });
});

describe("onboardingAlerts — empty real store", () => {
  it("nudges to connect a source when nothing is connected", () => {
    expect(onboardingAlerts(signals({})).some((a) => a.id === "ob-connect")).toBe(
      true
    );
  });

  it("nudges to sync the catalogue once connected but empty", () => {
    const s = signals({ connectedProviders: ["shopify"] });
    expect(onboardingAlerts(s).some((a) => a.id === "ob-sync")).toBe(true);
  });
});
