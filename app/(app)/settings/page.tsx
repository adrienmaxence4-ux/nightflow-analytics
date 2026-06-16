"use client";

import { useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "available" | "soon";
  logo: string;
  accent: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "shopify", name: "Shopify", description: "Produits, commandes & clients en temps réel.", status: "available", logo: "🛍", accent: "from-emerald-400 to-emerald-600" },
  { id: "stripe", name: "Stripe", description: "Paiements, churn & MRR.", status: "available", logo: "💳", accent: "from-indigo-400 to-violet-500" },
  { id: "ga4", name: "Google Analytics 4", description: "Trafic, attribution & funnel.", status: "available", logo: "📈", accent: "from-amber-300 to-orange-500" },
  { id: "meta", name: "Meta Ads", description: "Performance Facebook & Instagram.", status: "available", logo: "📘", accent: "from-blue-400 to-blue-600" },
  { id: "tiktok", name: "TikTok Ads", description: "ROAS & créatives par campagne.", status: "available", logo: "🎵", accent: "from-neon-pink to-neon-violet" },
  { id: "klaviyo", name: "Klaviyo", description: "Email & SMS + automatisations.", status: "soon", logo: "✉️", accent: "from-fuchsia-400 to-pink-500" },
];

const SECTIONS = [
  { id: "profile", label: "Profil" },
  { id: "integrations", label: "Intégrations" },
  { id: "api", label: "Clés API" },
];

export default function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState("integrations");
  const [connected, setConnected] = useState<Record<string, boolean>>({
    tiktok: true,
  });

  const toggle = (id: string, name: string) => {
    setConnected((p) => ({ ...p, [id]: !p[id] }));
    toast(connected[id] ? `${name} déconnecté` : `${name} connecté ✓`);
  };

  return (
    <PageTransition>
      <PageHeader
        title="Paramètres"
        subtitle="Gérez votre espace de travail, vos intégrations et vos clés"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
        <Card className="h-fit p-2">
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition ${
                  tab === s.id
                    ? "bg-glass-2 text-white shadow-[inset_0_0_0_1px_rgba(160,200,255,0.2)]"
                    : "text-ink-dim hover:bg-glass-2 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </Card>

        <div className="flex flex-col gap-5">
          {tab === "integrations" && (
            <Card className="p-5">
              <h3 className="mb-1 text-[15px] font-bold">Sources connectées</h3>
              <p className="mb-5 text-xs text-ink-mut">
                Nightflow agrège les données de chaque boutique, plateforme pub et
                outil analytics que vous connectez. (Connexion réelle en Phase 2.)
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {INTEGRATIONS.map((i) => {
                  const isOn = connected[i.id] ?? false;
                  return (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass-2 p-3.5 transition hover:border-glass-hi"
                    >
                      <span
                        className={`grid h-11 w-11 flex-none place-items-center rounded-xl bg-gradient-to-br text-lg ${i.accent}`}
                      >
                        {i.logo}
                      </span>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <b className="text-[13px]">{i.name}</b>
                          {isOn && <Badge variant="lime">Connecté</Badge>}
                          {i.status === "soon" && (
                            <Badge variant="violet">Bientôt</Badge>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-ink-mut">
                          {i.description}
                        </p>
                      </div>
                      <button
                        disabled={i.status === "soon"}
                        onClick={() => toggle(i.id, i.name)}
                        className={`flex-none rounded-xl px-3 py-2 text-xs font-bold transition ${
                          i.status === "soon"
                            ? "cursor-not-allowed border border-glass-border bg-glass text-ink-mut"
                            : isOn
                              ? "border border-glass-border bg-glass text-ink-dim hover:border-neon-pink hover:text-white"
                              : "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:brightness-110"
                        }`}
                      >
                        {i.status === "soon"
                          ? "Bientôt"
                          : isOn
                            ? "Déconnecter"
                            : "Connecter"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === "profile" && (
            <Card className="p-5">
              <h3 className="mb-4 text-[15px] font-bold">Profil</h3>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-glass-hi bg-gradient-to-br from-neon-pink to-neon-violet text-xl font-extrabold">
                  {user?.initials ?? "NF"}
                </div>
                <div>
                  <div className="text-[15px] font-bold">{user?.name}</div>
                  <div className="text-xs text-ink-mut">{user?.email}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  ["Nom de la boutique", user?.store ?? "Nightflow Studio"],
                  ["Fuseau horaire", "Europe/Paris (GMT+1)"],
                  ["Devise", "EUR (€)"],
                  ["Langue", "Français"],
                ].map(([l, v]) => (
                  <label key={l} className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-ink-mut">
                      {l}
                    </span>
                    <Input defaultValue={v} />
                  </label>
                ))}
              </div>
              <Button className="mt-5" onClick={() => toast("Profil enregistré")}>
                Enregistrer
              </Button>
            </Card>
          )}

          {tab === "api" && (
            <Card className="p-5">
              <h3 className="mb-1 text-[15px] font-bold">Clés API</h3>
              <p className="mb-4 text-xs text-ink-mut">
                Intégrez Nightflow à vos propres applications.
              </p>
              {[
                { name: "Production", key: "pk_live_•••• 2f9a" },
                { name: "Développement", key: "pk_test_•••• 7b1c" },
              ].map((k, i) => (
                <div
                  key={i}
                  className="mb-2 flex items-center justify-between rounded-xl border border-glass-border bg-night-950 px-4 py-3 font-mono text-[12px]"
                >
                  <span className="text-ink-dim">
                    <b className="mr-3 not-italic text-white">{k.name}</b>
                    {k.key}
                  </span>
                  <button
                    onClick={() => toast("Clé copiée")}
                    className="rounded-lg border border-glass-border bg-glass px-3 py-1 text-[11px] font-semibold text-ink-dim hover:text-white"
                  >
                    Copier
                  </button>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
