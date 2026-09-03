"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, FlaskConical, Eraser } from "lucide-react";
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
  const [clearing, setClearing] = useState(false);

  const refresh = () => {
    loadRange(range);
    toast("Données actualisées");
  };

  const clearDemo = async () => {
    if (clearing) return;
    if (
      !window.confirm(
        "Supprimer toutes les données de démo (métriques, campagnes, commandes, produits de démo) ? Les produits Shopify réels sont conservés et re-synchronisés."
      )
    ) {
      return;
    }
    setClearing(true);
    toast("Nettoyage des données de démo…", "info");
    try {
      const res = await fetch("/api/demo/clear", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error ?? "Nettoyage impossible", "info");
        return;
      }
      if (d.shopifyConnected) {
        toast("Démo supprimée — re-synchronisation Shopify…", "info");
        await fetch("/api/integrations/shopify/sync", { method: "POST" }).catch(
          () => {}
        );
      }
      toast("Données de démo supprimées ✓");
      loadRange(range);
    } catch {
      toast("Nettoyage impossible", "info");
    } finally {
      setClearing(false);
    }
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="basis-full min-[900px]:mr-auto min-[900px]:basis-auto">
          <h2 className="font-display text-title">Vue d&apos;ensemble</h2>
          <div className="mt-1 text-[15px] text-ink3 min-[900px]:text-[17px]">{data.sub}</div>
        </div>
        <RangeToggle value={range} onChange={setRange} />
        <button
          onClick={refresh}
          className="inline-flex h-tap items-center gap-2 rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition duration-base ease-out hover:bg-panel2"
        >
          <RefreshCw className="h-[18px] w-[18px]" aria-hidden />
          Actualiser
        </button>
        {isAdmin && (
          <button
            onClick={seedSample}
            disabled={seeding}
            title="Admin — remplit la boutique avec des ventes/visiteurs de test"
            className="inline-flex h-tap items-center gap-2 rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition duration-base ease-out hover:bg-panel2 disabled:opacity-60"
          >
            <FlaskConical className="h-[18px] w-[18px]" aria-hidden />
            {seeding ? "Génération…" : "Données de test"}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={clearDemo}
            disabled={clearing}
            title="Admin — supprime les données de démo, garde le store réel"
            className="inline-flex h-tap items-center gap-2 rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition duration-base ease-out hover:bg-panel2 disabled:opacity-60"
          >
            <Eraser className="h-[18px] w-[18px]" aria-hidden />
            {clearing ? "Nettoyage…" : "Nettoyer la démo"}
          </button>
        )}
        <ReportMenu />
      </div>

      {/* Le tri d'abord : on doit voir ce qui ne va pas avant les chiffres. */}
      <Triage />

      {/* Trois chiffres, pas douze. Le détail vit dans Analyses, Produits et
          Copilote — inutile de le dupliquer ici. */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {data.kpis
          .filter((k) => KPIS_ACCUEIL.includes(k.key))
          .map((k) => (
            <KpiCard key={k.key} kpi={k} onClick={() => setActiveKpi(k)} />
          ))}
      </div>

      <KpiDrawer kpi={activeKpi} range={data} onClose={() => setActiveKpi(null)} />
    </PageTransition>
  );
}
