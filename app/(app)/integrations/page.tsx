"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { ShopifyConnect } from "@/features/integrations/shopify-connect";
import { OAuthConnect } from "@/features/integrations/oauth-connect";
import { UpgradeGate } from "@/features/billing/upgrade-gate";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  accent: string;
  willSync: string[];
}

// OAuth-only providers — require app registration + platform review before
// they can go live, so they stay "Coming soon" for now.
const COMING_SOON: Integration[] = [
  {
    id: "meta",
    name: "Meta Ads",
    category: "Publicité",
    description: "Performance des campagnes Facebook & Instagram, ROAS, créatives.",
    logo: "📘",
    accent: "from-blue-400 to-blue-600",
    willSync: ["Dépenses", "ROAS", "Créatives"],
  },
  {
    id: "tiktok",
    name: "TikTok Ads",
    category: "Publicité",
    description: "Suivi des campagnes TikTok, coût par acquisition et tendances.",
    logo: "🎵",
    accent: "from-neon-pink to-neon-violet",
    willSync: ["Dépenses", "ROAS", "Vues"],
  },
];

export default function IntegrationsPage() {
  const toast = useToast();
  const { plan } = usePlan();

  return (
    <PageTransition>
      <PageHeader
        title="Intégrations"
        subtitle="Connectez vos outils — Nightflow centralise toutes vos données en un seul cerveau."
      />

      {/* Connecteurs — réservés au plan Pro et plus (le plan Gratuit = démo). */}
      {plan.integrations ? (
        <div className="flex flex-col gap-4">
          <ShopifyConnect />
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
            description="Connexion en un clic — trafic, canaux d'acquisition & appareils."
            connectedHint="Trafic, canaux & appareils affichés dans Analytics."
            showSync={false}
          />
        </div>
      ) : (
        <UpgradeGate
          title="Connectez vos boutiques avec le plan Pro"
          message="Le plan Gratuit donne accès à la démo. Passez en Pro pour connecter Shopify, Stripe, Klaviyo et Google Analytics et analyser vos vraies données."
        />
      )}

      <Card className="p-5 [background:linear-gradient(110deg,rgba(154,107,255,0.14),rgba(61,242,255,0.06))]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-glass-hi bg-glass-2 text-lg">
            🔌
          </span>
          <div>
            <h3 className="text-[14px] font-bold">
              Régies publicitaires — bientôt
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
              Meta Ads et TikTok Ads passent par une connexion OAuth qui
              nécessite la validation de l&apos;app par chaque plateforme. Une
              fois disponibles, le Copilot analysera aussi ces données. Activez
              les notifications pour être prévenu.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {COMING_SOON.map((integration, i) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card hover className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-xl ${integration.accent}`}
                >
                  {integration.logo}
                </span>
                <Badge variant="violet">Coming Soon</Badge>
              </div>

              <h3 className="mt-4 text-[16px] font-extrabold">{integration.name}</h3>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-mut">
                {integration.category}
              </div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-dim">
                {integration.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {integration.willSync.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass px-2 py-0.5 text-[10px] font-semibold text-ink-dim"
                  >
                    <Check className="h-2.5 w-2.5 text-neon-cyan" strokeWidth={3} />
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() =>
                  toast(`Vous serez notifié au lancement de ${integration.name} ✓`)
                }
                className="mt-4 w-full rounded-xl border border-glass-border bg-glass py-2.5 text-[13px] font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white hover:shadow-glow"
              >
                Me notifier au lancement
              </button>
            </Card>
          </motion.div>
        ))}

        {/* Suggest an integration */}
        <Card className="flex h-full flex-col items-center justify-center gap-3 border-dashed p-5 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-dashed border-glass-hi text-xl text-ink-mut">
            ＋
          </span>
          <div>
            <h3 className="text-[14px] font-bold">Un outil manquant ?</h3>
            <p className="mt-1 text-[12px] text-ink-mut">
              Gorgias, Amazon, PayPal… dites-nous lequel.
            </p>
          </div>
          <button
            onClick={() => toast("Merci ! Votre suggestion a été enregistrée.")}
            className="rounded-xl border border-glass-border bg-glass px-4 py-2 text-[12px] font-semibold text-ink-dim transition hover:border-neon-cyan hover:text-white"
          >
            Suggérer une intégration
          </button>
        </Card>
      </div>
    </PageTransition>
  );
}
