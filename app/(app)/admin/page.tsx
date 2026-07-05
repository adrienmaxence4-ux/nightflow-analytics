"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Founder-only dashboard: site visitors, signups, paying plans and REAL Stripe
 * revenue. Server-side gated by /api/admin/stats (403 for non-admins).
 */
interface Stats {
  totals: {
    visitors30: number;
    usersTotal: number;
    payingSubs: number;
    revenueTotalCents: number;
    mrrCents: number;
  };
  subsByPlan: { pro: number; scale: number };
  series: { label: string; visiteurs: number; inscrits: number; revenus: number }[];
}

const euros = (cents: number) =>
  `€${(cents / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`;

const TOOLTIP_STYLE = {
  backgroundColor: "#0d1230",
  border: "1px solid rgba(160,200,255,0.25)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e6ecff",
} as const;

export default function AdminStatsPage() {
  const isAdmin = useIsAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) setStats(j as Stats);
        else setError(j.error ?? "Accès refusé");
      })
      .catch(() => setError("Chargement impossible"));
  }, []);

  return (
    <PageTransition>
      <PageHeader
        title="Statistiques du site"
        subtitle="Visible par toi seul — visiteurs, inscriptions, abonnements et revenus réels (Stripe)"
      />

      {error && (
        <Card className="p-6 text-sm text-neon-pinksoft">{error}</Card>
      )}

      {!stats && !error && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      )}

      {stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              ["Visiteurs (30 j)", stats.totals.visitors30.toLocaleString("fr-FR"), "uniques / jour cumulés"],
              ["Comptes créés", stats.totals.usersTotal.toLocaleString("fr-FR"), "au total"],
              ["Abonnés payants", String(stats.totals.payingSubs), `${stats.subsByPlan.pro} Pro · ${stats.subsByPlan.scale} Scale`],
              ["Encaissé (60 j)", euros(stats.totals.revenueTotalCents), "paiements Stripe réussis"],
              ["Revenu mensuel (MRR)", euros(stats.totals.mrrCents), "abonnements actifs × prix"],
            ].map(([l, v, s]) => (
              <Card key={l} className="p-4">
                <div className="text-[11px] font-semibold text-ink-mut">{l}</div>
                <div className="mt-1.5 text-[24px] font-extrabold tracking-tight">{v}</div>
                <div className="mt-1 text-[10px] text-ink-mut">{s}</div>
              </Card>
            ))}
          </div>

          {/* Visitors + signups */}
          <Card className="p-5">
            <h3 className="mb-4 text-[15px] font-bold">
              Visiteurs & inscriptions — 30 derniers jours
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.series}>
                  <defs>
                    <linearGradient id="gVis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3df2ff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3df2ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(120,140,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#8b93b8", fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fill: "#8b93b8", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="visiteurs" stroke="#3df2ff" strokeWidth={2.5} fill="url(#gVis)" name="Visiteurs" />
                  <Area type="monotone" dataKey="inscrits" stroke="#9a6bff" strokeWidth={2} fill="transparent" name="Inscrits" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-5">
            <h3 className="mb-4 text-[15px] font-bold">
              Revenus encaissés (€ / jour) — Stripe, 30 derniers jours
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.series}>
                  <CartesianGrid stroke="rgba(120,140,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#8b93b8", fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fill: "#8b93b8", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`€${v}`, "Revenus"]} />
                  <Bar dataKey="revenus" fill="#7dffb0" radius={[6, 6, 0, 0]} name="Revenus (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {stats.totals.revenueTotalCents === 0 && (
              <p className="mt-3 text-[12px] text-ink-mut">
                Aucun paiement encaissé pour l&apos;instant — ce graphique
                s&apos;animera dès ton premier client 💶
              </p>
            )}
          </Card>
        </>
      )}

      {!isAdmin && stats === null && !error && null}
    </PageTransition>
  );
}
