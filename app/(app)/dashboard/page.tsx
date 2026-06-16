"use client";

import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { RangeToggle } from "@/components/ui/range-toggle";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { RevenueChart } from "@/features/dashboard/revenue-chart";
import { ProductBars } from "@/features/dashboard/product-bars";
import { Funnel } from "@/features/dashboard/funnel";
import { KpiDrawer } from "@/features/dashboard/kpi-drawer";
import { ProductTable } from "@/features/products/product-table";
import { ProductDrawer } from "@/features/products/product-drawer";
import { CopilotPanel } from "@/features/copilot/copilot-panel";
import { useToast } from "@/hooks/use-toast";
import { useRange } from "@/hooks/use-range";
import { getRangeDataSync } from "@/services/analytics.service";
import { getProducts } from "@/services/products.service";
import { parseMetric } from "@/utils/format";
import type { Kpi, Product } from "@/types";

export default function DashboardPage() {
  const toast = useToast();
  const { range, setRange } = useRange("day");
  const [data, setData] = useState(getRangeDataSync("day"));
  const [activeKpi, setActiveKpi] = useState<Kpi | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const products = getProducts();

  useEffect(() => {
    setData(getRangeDataSync(range));
  }, [range]);

  // Simulated live visitor counter (day view only)
  useEffect(() => {
    if (range !== "day") return;
    const id = setInterval(() => {
      setData((prev) => ({
        ...prev,
        kpis: prev.kpis.map((k) =>
          k.key === "visitors"
            ? {
                ...k,
                value: Math.max(
                  120,
                  parseMetric(k.value) + Math.floor(Math.random() * 40 - 18)
                ).toLocaleString("fr-FR"),
              }
            : k
        ),
      }));
    }, 4000);
    return () => clearInterval(id);
  }, [range]);

  const refresh = () => {
    setData((prev) => ({
      ...prev,
      series: prev.series.map((p) => ({
        ...p,
        revenue: Math.max(1, Math.round(p.revenue * (0.92 + Math.random() * 0.18))),
        orders: Math.max(1, Math.round(p.orders * (0.92 + Math.random() * 0.18))),
      })),
    }));
    toast("Données actualisées en temps réel");
  };

  return (
    <PageTransition>
      <div className="flex flex-wrap items-center gap-3.5">
        <div>
          <h2 className="text-base font-extrabold">Vue d&apos;ensemble</h2>
          <div className="text-xs text-ink-mut">{data.sub}</div>
        </div>
        <RangeToggle value={range} onChange={setRange} />
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white hover:shadow-glow"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </button>
        <button
          onClick={() => toast("Rapport MoonStore généré et envoyé par email")}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-3.5 py-2 text-xs font-bold text-night-950 shadow-glow transition hover:brightness-110"
        >
          <FileText className="h-3.5 w-3.5" />
          Générer un rapport
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k, i) => (
          <KpiCard key={k.key} kpi={k} index={i} onClick={() => setActiveKpi(k)} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <RevenueChart data={data} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProductBars data={data.bars} />
            <Funnel steps={data.funnel} />
          </div>
          <ProductTable products={products} onSelect={setActiveProduct} />
        </div>
        <div className="xl:sticky xl:top-[88px] xl:self-start">
          <CopilotPanel />
        </div>
      </div>

      <KpiDrawer kpi={activeKpi} range={data} onClose={() => setActiveKpi(null)} />
      <ProductDrawer
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
      />
    </PageTransition>
  );
}
