"use client";

import { useEffect, useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ShopifyConnect } from "@/features/integrations/shopify-connect";
import { OAuthConnect } from "@/features/integrations/oauth-connect";
import { UpgradeGate } from "@/features/billing/upgrade-gate";
import { InstallApp } from "@/features/pwa/install-app";
import { usePlan } from "@/hooks/use-plan";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  accent: string;
}

// OAuth-only sources — need platform app review before they go live → "Bientôt".
const INTEGRATIONS: Integration[] = [
  { id: "meta", name: "Meta Ads", description: "Performance Facebook & Instagram.", logo: "📘", accent: "from-blue-400 to-blue-600" },
  { id: "tiktok", name: "TikTok Ads", description: "ROAS & créatives par campagne.", logo: "🎵", accent: "from-neon-pink to-neon-violet" },
];

const SECTIONS = [
  { id: "profile", label: "Profil" },
  { id: "integrations", label: "Intégrations" },
  { id: "api", label: "Clés API" },
  { id: "app", label: "Application" },
];

export default function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { plan } = usePlan();
  const [tab, setTab] = useState("integrations");
  const [storeName, setStoreName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.store) setStoreName(user.store);
  }, [user?.store]);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName }),
      });
      const data = await res.json().catch(() => ({}));
      toast(res.ok ? "Profil enregistré ✓" : data.error ?? "Échec de l'enregistrement", res.ok ? "success" : "info");
    } catch {
      toast("Échec de l'enregistrement", "info");
    } finally {
      setSaving(false);
    }
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
          {tab === "integrations" && !plan.integrations && (
            <UpgradeGate
              title="Connectez vos boutiques avec Nightflow Pro"
              message="Le plan Gratuit reste sur la démo. Passez en Pro pour connecter Shopify, Stripe, Klaviyo & Google Analytics et importer vos vraies données."
              plan="Pro"
            />
          )}

          {tab === "integrations" && plan.integrations && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="mb-1 text-[15px] font-bold">
                  Connectez votre boutique
                </h3>
                <p className="mb-3 text-xs text-ink-mut">
                  Chaque utilisateur connecte sa propre boutique : Nightflow
                  importe alors ses produits, commandes et ventes (données
                  isolées par compte).
                </p>
                <ShopifyConnect />
              </div>

              <div className="flex flex-col gap-3">
                <OAuthConnect
                  provider="stripe"
                  name="Stripe"
                  logo="💳"
                  accent="from-indigo-400 to-violet-500"
                  description="Connexion en un clic — autorisez votre compte, aucune clé à créer."
                  connectedHint="Revenus & commandes importés depuis Stripe."
                />
                <OAuthConnect
                  provider="klaviyo"
                  name="Klaviyo"
                  logo="✉️"
                  accent="from-fuchsia-400 to-pink-500"
                  description="Connexion en un clic — autorisez votre compte, aucune clé à créer."
                  connectedHint="Revenu attribué Klaviyo affiché dans Marketing."
                />
                <OAuthConnect
                  provider="google"
                  name="Google Analytics"
                  logo="📈"
                  accent="from-amber-300 to-orange-500"
                  description="Connexion en un clic — trafic, canaux & appareils."
                  connectedHint="Trafic, canaux & appareils affichés dans Analytics."
                  showSync={false}
                />
              </div>

              <Card className="p-5">
                <h3 className="mb-1 text-[15px] font-bold">
                  Régies publicitaires — bientôt
                </h3>
                <p className="mb-4 text-xs text-ink-mut">
                  Google Analytics, Meta Ads et TikTok Ads passent par OAuth et
                  nécessitent la validation de l&apos;app par chaque plateforme.
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {INTEGRATIONS.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass-2 p-3.5"
                    >
                      <span
                        className={`grid h-11 w-11 flex-none place-items-center rounded-xl bg-gradient-to-br text-lg ${i.accent}`}
                      >
                        {i.logo}
                      </span>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <b className="text-[13px]">{i.name}</b>
                          <Badge variant="violet">Bientôt</Badge>
                        </div>
                        <p className="truncate text-[11px] text-ink-mut">
                          {i.description}
                        </p>
                      </div>
                      <button
                        disabled
                        className="flex-none cursor-not-allowed rounded-xl border border-glass-border bg-glass px-3 py-2 text-xs font-bold text-ink-mut"
                      >
                        Bientôt
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
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
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-ink-mut">
                    Nom de la boutique
                  </span>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Nightflow Studio"
                  />
                </label>
                {[
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
              <Button className="mt-5" onClick={saveProfile} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </Card>
          )}

          {tab === "app" && <InstallApp />}

          {tab === "api" && !plan.apiAccess && (
            <UpgradeGate
              title="Clés API & webhooks avec Nightflow Pro"
              message="L'accès API et les webhooks sont inclus à partir du plan Pro. Passez en Pro pour intégrer Nightflow à vos propres applications."
              plan="Pro"
            />
          )}

          {tab === "api" && plan.apiAccess && (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-glass-hi bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 text-xl">
                  🔑
                </span>
                <div>
                  <h3 className="text-[15px] font-bold">API & Webhooks</h3>
                  <p className="text-xs text-ink-mut">
                    Inclus dans votre plan — intégrez Nightflow à vos outils.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-glass-border bg-glass-2 p-4">
                <Badge variant="violet">En préparation</Badge>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-dim">
                  L&apos;API REST et les webhooks arrivent. Plutôt que d&apos;afficher
                  des clés factices, nous activerons ici la génération de vraies
                  clés sécurisées dès que l&apos;API publique sera prête et auditée.
                </p>
                <ul className="mt-3 flex flex-col gap-1.5 text-[12px] text-ink-mut">
                  <li>• Lecture de vos KPI, produits et commandes en JSON</li>
                  <li>
                    • Webhooks temps réel sur les alertes (rupture de stock, chute
                    de CA, anomalies)
                  </li>
                  <li>• Clés révocables, limitées à votre boutique</li>
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
