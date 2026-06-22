"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { DemoBanner } from "@/components/demo-banner";
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
import { useIsAdmin } from "@/hooks/use-admin";
import { getRangeDataSync } from "@/services/analytics.service";
import { getProducts } from "@/services/products.service";
import { generateStoreReport } from "@/services/report.service";
import { parseMetric } from "@/utils/format";
import type { Kpi, Product, Range } from "@/types";

export default function DashboardPage() {
  const toast = useToast();
  const { range, setRange } = useRange("day");
  const isAdmin = useIsAdmin();
  const [data, setData] = useState(getRangeDataSync("day"));
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [activeKpi, setActiveKpi] = useState<Kpi | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const loadRange = useCallback(async (r: Range) => {
    try {
      const res = await fetch(`/api/dashboard?range=${r}`);
      if (res.ok) {
        const j = await res.json();
        setData(j.data);
        setSource(j.source);
        return;
      }
    } catch {
      /* fall back */
    }
    setData(getRangeDataSync(r));
    setSource("mock");
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const j = await res.json();
        setProducts(j.products);
        return;
      }
    } catch {
      /* fall back */
    }
    setProducts(getProducts());
  }, []);

  useEffect(() => {
    loadRange(range);
  }, [range, loadRange]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Simulated live visitor counter — only on mock demo data, day view.
  useEffect(() => {
    if (range !== "day" || source !== "mock") return;
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
  }, [range, source]);

  const [reporting, setReporting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const refresh = () => {
    loadRange(range);
    loadProducts();
    toast("Données actualisées");
  };

  const seedSample = async () => {
    if (seeding) return;
    setSeeding(true);
    toast("Génération de données de test…", "info");
    try {
      const res = await fetch("/api/demo/sample", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(`Données de test ajoutées : ${d.orders ?? 0} commandes sur ${d.days ?? 0} jours ✓`);
        loadRange(range);
        loadProducts();
      } else {
        toast(d.error ?? "Génération impossible", "info");
      }
    } catch {
      toast("Génération impossible", "info");
    } finally {
      setSeeding(false);
    }
  };

  const downloadReport = async () => {
    if (reporting) return;
    setReporting(true);
    toast("Génération du rapport…", "info");
    const { source } = await generateStoreReport();
    toast(
      source === "db"
        ? "Rapport téléchargé ✓"
        : "Rapport (démo) téléchargé ✓"
    );
    setReporting(false);
  };

  return (
    <PageTransition>
      <DemoBanner
        source={source}
        onSeeded={() => {
          loadRange(range);
          loadProducts();
        }}
      />
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
        {isAdmin && (
          <button
            onClick={seedSample}
            disabled={seeding}
            title="Admin — remplit la boutique avec des ventes/visiteurs de test"
            className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white hover:shadow-glow disabled:opacity-60"
          >
            🧪 {seeding ? "Génération…" : "Données de test"}
          </button>
        )}
        <button
          onClick={downloadReport}
          disabled={reporting}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-3.5 py-2 text-xs font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
        >
          <FileText className="h-3.5 w-3.5" />
          {reporting ? "Génération…" : "Générer un rapport"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k, i) => (
          <KpiCard
            key={k.key}
            kpi={k}
            index={i}
            series={data.series}
            onClick={() => setActiveKpi(k)}
          />
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
