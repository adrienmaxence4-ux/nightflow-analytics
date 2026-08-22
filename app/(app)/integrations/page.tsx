"use client";

import type { ReactNode } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { ApiKeyConnect } from "@/features/integrations/api-key-connect";
import { ShopifyConnect } from "@/features/integrations/shopify-connect";
import { WixConnect } from "@/features/integrations/wix-connect";
import { WooConnect } from "@/features/integrations/woo-connect";
import { OAuthConnect } from "@/features/integrations/oauth-connect";
import { UpgradeGate } from "@/features/billing/upgrade-gate";

export default function IntegrationsPage() {
  const toast = useToast();
  const { plan } = usePlan();

  return (
    <PageTransition>
      <PageHeader
        title="Intégrations"
        subtitle="Connectez vos outils — Nightflow centralise toutes vos données en un seul cerveau."
      />

      {/* Connecteurs — groupés par usage (le plan Gratuit = démo). */}
      {plan.integrations ? (
        <div className="flex flex-col gap-6">
          <CategorySection
            label="Boutique & paiements"
            hint="Vos ventes réelles : produits, commandes, revenus."
          >
            <ShopifyConnect />
            <WixConnect />
            <WooConnect />
            <OAuthConnect
              provider="stripe"
              name="Stripe"
              logo="💳"
              accent="from-indigo-400 to-violet-500"
              description="Connexion en un clic — autorisez votre compte, aucune clé à créer."
              connectedHint="Revenus & commandes importés depuis Stripe."
            />
            <ApiKeyConnect
              provider="paypal"
              name="PayPal"
              logo="🅿️"
              accent="from-blue-400 to-cyan-500"
              description="Transactions PayPal — beaucoup d'acheteurs ne paient qu'avec ça."
              connectedHint="Paiements et remboursements PayPal importés."
              placeholder="idClient::secretClient"
              helpHref="https://developer.paypal.com/api/rest/#link-getcredentials"
              helpLabel="Créer mes identifiants"
            />
          </CategorySection>

          <CategorySection
            label="Publicité"
            hint="Dépense, revenu attribué et ROAS de vos régies — Meta, TikTok, Google Ads et les autres."
          >
            <OAuthConnect
              provider="meta"
              name="Meta Ads"
              logo="📘"
              accent="from-blue-500 to-indigo-600"
              description="Connexion en un clic — autorisez votre compte, aucune clé à créer. Facebook & Instagram Ads."
              connectedHint="Dépense, revenu attribué et ROAS Meta affichés dans Marketing."
            />
            <OAuthConnect
              provider="instagram"
              name="Instagram"
              logo="📸"
              accent="from-pink-500 to-orange-400"
              description="Connexion en un clic — vues, likes et portée de vos Reels. Aucune Page Facebook requise."
              connectedHint="Statistiques de vos publications visibles dans Mes publications."
              showSync={false}
            />
            <ApiKeyConnect
              provider="windsor"
              name="Régies publicitaires (Windsor.ai)"
              logo="📣"
              accent="from-sky-400 to-blue-600"
              description="TikTok Ads, Google Ads, LinkedIn… et Meta si vous préférez ne pas le connecter directement. Autorisez vos comptes sur Windsor, puis collez ici votre clé API — ou l'URL que Windsor affiche."
              connectedHint="Dépense & ROAS par régie affichés dans Marketing."
              placeholder="Clé API ou URL Windsor.ai"
              helpHref="https://onboard.windsor.ai/"
              helpLabel="Connecter mes régies & copier ma clé"
            />
          </CategorySection>

          <CategorySection
            label="Email & CRM"
            hint="Revenu attribué à vos campagnes email."
          >
            <OAuthConnect
              provider="klaviyo"
              name="Klaviyo"
              logo="✉️"
              accent="from-fuchsia-400 to-pink-500"
              description="Connexion en un clic — autorisez votre compte, aucune clé à créer."
              connectedHint="Revenu attribué Klaviyo affiché dans Marketing."
            />
          </CategorySection>

          <CategorySection
            label="Analyse d'audience"
            hint="Pour analyser le trafic — ce n'est pas une campagne (aucune dépense / ROAS)."
          >
            <OAuthConnect
              provider="google"
              name="Google Analytics"
              logo="📈"
              accent="from-amber-300 to-orange-500"
              description="Connexion en un clic — trafic, canaux d'acquisition & appareils."
              connectedHint="Trafic, canaux & appareils affichés dans Analytics."
              showSync={false}
            />
            <ApiKeyConnect
              provider="hotjar"
              name="Hotjar"
              logo="🔥"
              accent="from-orange-400 to-red-500"
              description="Comportement réel des visiteurs (retours, enregistrements)."
              connectedHint="Retours visiteurs remontés dans Analytics."
              placeholder="idDuSite::jetonApi"
              helpHref="https://help.hotjar.com/hc/en-us/articles/36819965653009-How-to-Set-Up-the-Hotjar-API"
              helpLabel="Créer un jeton (plan Scale requis)"
            />
          </CategorySection>

          <CategorySection
            label="Logistique & expédition"
            hint="Suivi des envois et de leur coût — pour savoir ce que la livraison mange sur ta marge."
          >
            <ApiKeyConnect
              provider="shipstation"
              name="ShipStation"
              logo="📦"
              accent="from-sky-400 to-blue-500"
              description="Centralise tes envois et leurs coûts."
              connectedHint="Expéditions et coûts importés."
              placeholder="cleApi::secretApi"
              helpHref="https://www.shipstation.com/docs/api/"
              helpLabel="Où trouver mes clés"
            />
            <ApiKeyConnect
              provider="mondialrelay"
              name="Mondial Relay"
              logo="🚚"
              accent="from-emerald-400 to-teal-500"
              description="Suivi des colis en point relais (France & Europe)."
              connectedHint="Expéditions Mondial Relay importées."
              placeholder="enseigne::clePrivee"
            />
          </CategorySection>

          <CategorySection
            label="Service client"
            hint="Un pic de tickets précède souvent une chute de ventes."
          >
            <ApiKeyConnect
              provider="gorgias"
              name="Gorgias"
              logo="💬"
              accent="from-violet-400 to-purple-500"
              description="Tickets de support, pour relier réclamations et ventes."
              connectedHint="Volume de tickets suivi dans Analytics."
              placeholder="domaine::email::cleApi"
              helpHref="https://developers.gorgias.com/reference/authentication"
              helpLabel="Créer une clé API"
            />
          </CategorySection>
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
              TikTok Ads — en attente d&apos;approbation
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
              La connexion directe à TikTok demande une revue
              sandbox→production et un audit de sécurité des données — c&apos;est
              l&apos;API publicitaire la plus verrouillée. En attendant, TikTok
              passe par la carte «&nbsp;Régies publicitaires&nbsp;» ci-dessus, et
              Meta Ads se connecte déjà en un clic.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

function CategorySection({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-neon-cyansoft">
          {label}
        </div>
        <p className="mt-0.5 text-[11px] text-ink-mut">{hint}</p>
      </div>
      {children}
    </div>
  );
}
