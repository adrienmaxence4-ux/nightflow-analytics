"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { DemoBanner } from "@/components/demo-banner";
import { RangeToggle } from "@/components/ui/range-toggle";
import { Triage } from "@/features/dashboard/triage";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { KpiDrawer } from "@/features/dashboard/kpi-drawer";
import { ReportMenu } from "@/features/reports/report-menu";
import { TestPanel } from "@/features/admin/test-panel";
import { useToast } from "@/hooks/use-toast";
import { useRange } from "@/hooks/use-range";
import { useIsAdmin } from "@/hooks/use-admin";
import { getRangeDataSync } from "@/services/analytics.service";
import { parseMetric } from "@/utils/format";
import type { Kpi, Range } from "@/types";

/** Les seuls indicateurs de l'accueil : l'argent, la conversion, le trafic. */
const KPIS_ACCUEIL = ["revenue", "conversion", "visitors"];

export default function DashboardPage() {
  const toast = useToast();
  const { range, setRange } = useRange("day");
  const isAdmin = useIsAdmin();
  const [data, setData] = useState(getRangeDataSync("day"));
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const [activeKpi, setActiveKpi] = useState<Kpi | null>(null);

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

  useEffect(() => {
    loadRange(range);
  }, [range, loadRange]);

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

  const [seeding, setSeeding] = useState(false);

  const refresh = () => {
    loadRange(range);
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
      } else {
        toast(d.error ?? "Génération impossible", "info");
      }
    } catch {
      toast("Génération impossible", "info");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <PageTransition>
      <DemoBanner
        source={source}
        onSeeded={() => {
          loadRange(range);
        }}
      />
      <TestPanel
        onApplied={() => {
          loadRange(range);
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
        <ReportMenu />
      </div>

      {/* Le tri d'abord : on doit voir ce qui ne va pas avant les chiffres. */}
      <Triage />

      {/* Trois chiffres, pas douze. Le détail vit dans Analyses, Produits et
          Copilote — inutile de le dupliquer ici. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {data.kpis
          .filter((k) => KPIS_ACCUEIL.includes(k.key))
          .map((k, i) => (
            <KpiCard
              key={k.key}
              kpi={k}
              index={i}
              series={data.series}
              onClick={() => setActiveKpi(k)}
            />
          ))}
      </div>

      <KpiDrawer kpi={activeKpi} range={data} onClose={() => setActiveKpi(null)} />
    </PageTransition>
  );
}
