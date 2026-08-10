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
  adPerformance?: { code: string; visits: number }[];
  pays?: {
    code: string;
    nom: string;
    langue: string;
    visiteurs: number;
    part: number;
  }[];
}

interface StripeCheck {
  verdict: "live" | "test" | "incomplet";
  checks: { name: string; mode: string; ok: boolean; detail: string }[];
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
  const [vipEmail, setVipEmail] = useState("");
  const [vipMsg, setVipMsg] = useState<string | null>(null);
  const [vipBusy, setVipBusy] = useState(false);
  const [maintenance, setMaintenance] = useState<boolean | null>(null);
  const [maintBusy, setMaintBusy] = useState(false);
  const [stripe, setStripe] = useState<StripeCheck | null>(null);

  const toggleMaintenance = async () => {
    if (maintBusy || maintenance === null) return;
    const next = !maintenance;
    if (next && !window.confirm("Bloquer TOUT le site pour les visiteurs ? Toi seul garderas l'accès.")) {
      return;
    }
    setMaintBusy(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMaintenance(!!d.maintenance);
    } catch {
      /* ignore — state unchanged */
    } finally {
      setMaintBusy(false);
    }
  };

  const grantVip = async () => {
    if (vipBusy || !vipEmail.trim()) return;
    setVipBusy(true);
    setVipMsg(null);
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: vipEmail }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setVipMsg(
          d.applied === "now"
            ? `✅ ${vipEmail.trim()} est passé en Scale immédiatement.`
            : `✅ Accès Scale réservé — il s'activera tout seul quand ${vipEmail.trim()} créera son compte.`
        );
        setVipEmail("");
      } else {
        setVipMsg(`❌ ${d.error ?? "Échec"}`);
      }
    } catch {
      setVipMsg("❌ Échec réseau");
    } finally {
      setVipBusy(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) setStats(j as Stats);
        else setError(j.error ?? "Accès refusé");
      })
      .catch(() => setError("Chargement impossible"));
    fetch("/api/admin/maintenance", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setMaintenance(!!j.maintenance))
      .catch(() => {});
    fetch("/api/admin/stripe-check", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setStripe(j as StripeCheck))
      .catch(() => {});
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

      {/* Audit Stripe : test ou réel ? */}
      {stripe && (
        <Card
          className={`p-5 ${
            stripe.verdict === "live"
              ? "border-neon-lime/40"
              : "border-neon-pinksoft/50 [background:linear-gradient(160deg,rgba(255,92,174,0.12),rgba(255,92,174,0.03))]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold">💳 Stripe — mode de paiement</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                stripe.verdict === "live"
                  ? "bg-neon-lime/15 text-neon-lime"
                  : "bg-neon-pinksoft/20 text-neon-pinksoft"
              }`}
            >
              {stripe.verdict === "live"
                ? "● RÉEL — tu encaisses vraiment"
                : stripe.verdict === "test"
                  ? "● TEST — paiements fictifs"
                  : "● INCOMPLET"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {stripe.checks.map((c) => (
              <div key={c.name} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 text-[13px] ${c.ok ? "text-neon-lime" : "text-neon-pinksoft"}`}
                >
                  {c.ok ? "✓" : "!"}
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-white">{c.name}</div>
                  <div className="text-[12px] text-ink-mut">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Interrupteur de maintenance — réservé à l'admin */}
      {maintenance !== null && (
        <Card
          className={`p-5 ${
            maintenance
              ? "border-neon-pinksoft/50 [background:linear-gradient(160deg,rgba(255,92,174,0.14),rgba(255,92,174,0.03))]"
              : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold">🛠️ Mode maintenance</h3>
              <p className="mt-1 text-xs text-ink-mut">
                {maintenance
                  ? "Le site est ACTUELLEMENT bloqué pour tous les visiteurs. Toi seul y as accès."
                  : "Bloque tout le site (page « maintenance ») pour les visiteurs. Toi, tu gardes l'accès complet."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                  maintenance
                    ? "bg-neon-pinksoft/20 text-neon-pinksoft"
                    : "bg-neon-lime/15 text-neon-lime"
                }`}
              >
                {maintenance ? "● ACTIVÉ" : "● SITE EN LIGNE"}
              </span>
              <button
                onClick={toggleMaintenance}
                disabled={maintBusy}
                className={`rounded-xl px-4 py-2.5 text-[13px] font-bold transition disabled:opacity-60 ${
                  maintenance
                    ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:brightness-110"
                    : "border border-neon-pinksoft/40 bg-neon-pinksoft/10 text-neon-pinksoft hover:bg-neon-pinksoft/20"
                }`}
              >
                {maintBusy
                  ? "…"
                  : maintenance
                    ? "Réactiver le site"
                    : "Activer la maintenance"}
              </button>
            </div>
          </div>
        </Card>
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

          {/* VIP access grant (influenceurs / testeurs) */}
          <Card className="p-5">
            <h3 className="text-[15px] font-bold">🎁 Offrir l&apos;accès Scale (VIP)</h3>
            <p className="mt-1 text-xs text-ink-mut">
              Entre l&apos;email d&apos;un testeur/influenceur : s&apos;il a un
              compte, il passe Scale immédiatement ; sinon l&apos;accès
              s&apos;activera automatiquement à son inscription.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={vipEmail}
                onChange={(e) => setVipEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && grantVip()}
                placeholder="email@dutesteur.com"
                className="glass-input min-w-[260px] flex-1 rounded-xl px-3 py-2.5 text-[13px] sm:max-w-[360px]"
              />
              <button
                onClick={grantVip}
                disabled={vipBusy}
                className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
              >
                {vipBusy ? "Activation…" : "Offrir Scale à vie"}
              </button>
            </div>
            {vipMsg && <p className="mt-2 text-[12px] text-ink-dim">{vipMsg}</p>}
          </Card>

          {/* Quelle pub marche (attribution ?a=CODE) */}
          <Card className="p-5">
            <h3 className="text-[15px] font-bold">🏆 Quelle pub marche</h3>
            <p className="mt-1 text-xs text-ink-mut">
              Visiteurs amenés par chaque publicité (30 j) — le lien de chaque pub
              contient son code. Le générateur privilégie les gagnantes.
            </p>
            {stats.adPerformance && stats.adPerformance.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                {stats.adPerformance.map((a, i) => {
                  const max = stats.adPerformance![0].visits || 1;
                  return (
                    <div key={a.code} className="flex items-center gap-3">
                      <span className="w-6 text-[12px] font-bold text-ink-mut">
                        {i + 1}.
                      </span>
                      <span className="w-32 flex-none truncate text-[13px] font-semibold text-white">
                        {a.code}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet"
                          style={{ width: `${Math.round((a.visits / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-[13px] font-bold text-neon-cyan">
                        {a.visits}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-ink-mut">
                Aucune visite attribuée pour l&apos;instant — publie une pub avec
                son lien de suivi et les résultats apparaîtront ici 📈
              </p>
            )}
          </Card>

          {/* D'où viennent les visiteurs — pour choisir la langue Instagram */}
          <Card className="p-5">
            <h3 className="text-[15px] font-bold">🌍 D&apos;où viennent tes visiteurs</h3>
            <p className="mt-1 text-xs text-ink-mut">
              Pays d&apos;origine sur 30 jours, et la langue à privilégier pour
              tes publications. Aucune adresse IP n&apos;est enregistrée — seul
              le pays est conservé.
            </p>
            {stats.pays && stats.pays.length > 0 ? (
              <>
                <div className="mt-4 flex flex-col gap-2">
                  {stats.pays.map((p) => (
                    <div key={p.code} className="flex items-center gap-3">
                      <span className="w-36 flex-none truncate text-[13px] font-semibold text-white">
                        {p.nom}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet"
                          style={{ width: `${Math.max(p.part, 2)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-[12px] text-ink-dim">
                        {p.langue}
                      </span>
                      <span className="w-16 text-right text-[13px] font-bold text-neon-cyan">
                        {p.visiteurs}
                      </span>
                    </div>
                  ))}
                </div>
                {(() => {
                  // Langue majoritaire = celle à utiliser sur Instagram.
                  const parLangue = new Map<string, number>();
                  for (const p of stats.pays!) {
                    parLangue.set(p.langue, (parLangue.get(p.langue) ?? 0) + p.visiteurs);
                  }
                  const [langue, n] = [...parLangue.entries()].sort(
                    (a, b) => b[1] - a[1]
                  )[0];
                  const total = [...parLangue.values()].reduce((t, x) => t + x, 0);
                  return (
                    <p className="mt-4 rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 px-3 py-2.5 text-[12.5px] text-ink-dim">
                      👉 Publie en <span className="font-bold text-white">{langue}</span> —{" "}
                      {Math.round((n / total) * 100)} % de tes visiteurs.
                    </p>
                  );
                })()}
              </>
            ) : (
              <p className="mt-3 text-[12px] text-ink-mut">
                Aucun pays enregistré pour l&apos;instant. Les visites déjà
                comptées n&apos;ont pas de pays : il apparaîtra à partir des
                prochaines, une fois cette version en ligne 🌍
              </p>
            )}
          </Card>

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
