"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Mail } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlan } from "@/hooks/use-plan";
import { ApiKeyConnect } from "@/features/integrations/api-key-connect";
import { ShopifyConnect } from "@/features/integrations/shopify-connect";
import { WixConnect } from "@/features/integrations/wix-connect";
import { WooConnect } from "@/features/integrations/woo-connect";
import { OAuthConnect } from "@/features/integrations/oauth-connect";
import { UpgradeGate } from "@/features/billing/upgrade-gate";
import { STORE_PLATFORMS, type StorePlatform } from "@/lib/signup";

/**
 * Ordered by what fills the dashboard first: the merchant's own store, then
 * payments, then campaigns. Connectors whose data no page reads yet sit in a
 * collapsed section that says so, instead of promising a chart.
 */
const STORE_CARDS = [
  { id: "shopify", label: "Shopify", Connect: ShopifyConnect },
  { id: "woocommerce", label: "WooCommerce", Connect: WooConnect },
  { id: "wix", label: "Wix", Connect: WixConnect },
] as const;

const SUPPORT_MAILTO =
  "mailto:adrienmaxence4@gmail.com?subject=" +
  encodeURIComponent("Nightflow — un outil à connecter");

export default function IntegrationsPage() {
  const { plan } = usePlan();
  // undefined = still loading, null = no usable answer.
  const [platform, setPlatform] = useState<StorePlatform | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { platform?: string } | null) => {
        if (cancelled) return;
        setPlatform(STORE_PLATFORMS.find((p) => p.id === d?.platform)?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlatform(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const declared = STORE_CARDS.find((c) => c.id === platform) ?? STORE_CARDS[0];
  const otherStores = STORE_CARDS.filter((c) => c.id !== declared.id);
  const storeHint =
    platform === declared.id
      ? `Vous avez indiqué ${declared.label} : c'est la première chose à connecter, elle remplit le dashboard.`
      : platform === "prestashop"
        ? "PrestaShop n'est pas encore pris en charge. Connectez Stripe ci-dessous pour vos ventes, ou l'une de ces plateformes."
        : "Connectez d'abord la boutique : c'est elle qui remplit le dashboard.";

  return (
    <PageTransition>
      <PageHeader
        title="Intégrations"
        subtitle="Connectez votre boutique d'abord, le reste ensuite."
      />

      {plan.integrations ? (
        <div className="flex flex-col gap-8">
          <CategorySection label="Votre boutique" hint={storeHint}>
            {platform === undefined ? (
              <Skeleton className="h-[100px] w-full" />
            ) : (
              <>
                <declared.Connect />
                <CollapsedSection
                  label="Autre plateforme ?"
                  hint="Une boutique sur une autre plateforme, ou plusieurs boutiques."
                >
                  {otherStores.map((c) => (
                    <c.Connect key={c.id} />
                  ))}
                </CollapsedSection>
              </>
            )}
          </CategorySection>

          <CategorySection
            label="Vos paiements"
            hint="Revenus et commandes, même sans boutique connectée."
          >
            <OAuthConnect
              provider="stripe"
              name="Stripe"
              logo="St"
              description="Connexion en un clic — autorisez votre compte, aucune clé à créer."
              connectedHint="Revenus & commandes importés depuis Stripe."
              fallbackLabel="Ou collez une clé restreinte"
              // Stripe Connect has no live client ID yet: customers lead with
              // the key, the owner keeps OAuth first.
              fallbackPrimary
              oauthFoldLabel="Connexion en un clic — bientôt"
              fallback={
                // Same provider row as the OAuth path: the key is stored where
                // the OAuth token would be, so the card above flips to
                // "Connecté" on its own.
                <ApiKeyConnect
                  compact
                  provider="stripe"
                  name="Stripe"
                  logo="St"
                  description="Clé restreinte en lecture seule."
                  connectedHint="Revenus & commandes importés depuis Stripe."
                  keyLabel="Clé restreinte Stripe"
                  keyHint="Dashboard Stripe → Développeurs → Clés API → Créer une clé restreinte, lecture seule sur Charges et Balance, puis collez-la ici."
                />
              }
            />
          </CategorySection>

          <CategorySection
            label="Vos campagnes"
            hint="Ce que vos emails et vos publicités rapportent, et d'où vient votre trafic."
          >
            <OAuthConnect
              provider="klaviyo"
              name="Klaviyo"
              logo="K"
              description="Connexion en un clic — autorisez votre compte, aucune clé à créer."
              connectedHint="Revenu attribué Klaviyo affiché dans Marketing."
            />
            <OAuthConnect
              provider="google"
              name="Google Analytics"
              logo="GA"
              description="Connexion en un clic — trafic, canaux d'acquisition & appareils."
              connectedHint="Trafic, canaux & appareils affichés dans Analytics."
              showSync={false}
            />
            <ApiKeyConnect
              provider="windsor"
              name="Meta Ads, TikTok Ads, Google Ads — via Windsor.ai"
              logo="Wd"
              description="Autorisez vos comptes publicitaires sur Windsor.ai, puis collez ici la clé API que Windsor affiche."
              connectedHint="Dépense & ROAS par régie affichés dans Marketing."
              keyLabel="Clé API Windsor.ai"
              keyHint="La clé API, ou l'URL de requête que Windsor.ai affiche."
              helpHref="https://onboard.windsor.ai/"
              helpLabel="Connecter mes régies & copier ma clé"
            />
          </CategorySection>

          <CategorySection
            label="Bientôt"
            hint="Meta et TikTok valident encore Nightflow. En attendant, vos campagnes Meta Ads et TikTok Ads passent par la carte Windsor.ai ci-dessus."
          >
            <OAuthConnect
              provider="instagram"
              name="Instagram"
              logo="Ig"
              description="Vues, likes et portée de vos Reels. Aucune Page Facebook requise."
              connectedHint="Vues, portée et engagement visibles dans Publications."
              showSync={false}
              reviewPending
              reviewHint="Dès que Meta valide Nightflow, le bouton s'active ici. Vos Reels et leur portée arriveront dans Publications."
            />
            <OAuthConnect
              provider="tiktok"
              name="TikTok"
              logo="Tk"
              description="Vues, likes, commentaires et partages de vos vidéos TikTok publiques, à côté de vos Reels."
              connectedHint="Vues et engagement de vos TikToks visibles dans Publications."
              showSync={false}
              reviewPending
              reviewer="TikTok"
              reviewHint="Dès que c'est validé, le bouton s'active ici : un clic pour connecter votre compte."
            />
            <OAuthConnect
              provider="meta"
              name="Meta Ads (connexion directe)"
              logo="M"
              description="Facebook & Instagram Ads en un clic, sans passer par Windsor."
              connectedHint="Dépense, revenu attribué et ROAS Meta affichés dans Marketing."
              reviewPending
            />
          </CategorySection>

          <CollapsedSection
            label="En préparation"
            hint="Ces connecteurs enregistrent vos données ; l'affichage dans Nightflow arrive ensuite."
          >
            <ApiKeyConnect
              provider="paypal"
              name="PayPal"
              logo="PP"
              description="Transactions PayPal — beaucoup d'acheteurs ne paient qu'avec ça."
              connectedHint="Paiements et remboursements PayPal collectés."
              keyLabel="Identifiants PayPal"
              keyHint="Format : idClient::secretClient"
              helpHref="https://developer.paypal.com/api/rest/#link-getcredentials"
              helpLabel="Créer mes identifiants"
              collectOnly
            />
            <ApiKeyConnect
              provider="hotjar"
              name="Hotjar"
              logo="Hj"
              description="Comportement réel des visiteurs (retours, enregistrements)."
              connectedHint="Retours visiteurs collectés."
              keyLabel="Identifiants Hotjar"
              keyHint="Format : idDuSite::jetonApi"
              helpHref="https://help.hotjar.com/hc/en-us/articles/36819965653009-How-to-Set-Up-the-Hotjar-API"
              helpLabel="Créer un jeton (plan Scale requis)"
              collectOnly
            />
            <ApiKeyConnect
              provider="shipstation"
              name="ShipStation"
              logo="Ss"
              description="Vos envois et leurs coûts, pour voir ce que la livraison prend sur la marge."
              connectedHint="Expéditions et coûts collectés."
              keyLabel="Identifiants ShipStation"
              keyHint="Format : cleApi::secretApi"
              helpHref="https://www.shipstation.com/docs/api/"
              helpLabel="Où trouver mes clés"
              collectOnly
            />
            <ApiKeyConnect
              provider="mondialrelay"
              name="Mondial Relay"
              logo="MR"
              description="Suivi des colis en point relais (France & Europe)."
              connectedHint="Expéditions Mondial Relay collectées."
              keyLabel="Identifiants Mondial Relay"
              keyHint="Format : enseigne::clePrivee"
              collectOnly
            />
            <ApiKeyConnect
              provider="gorgias"
              name="Gorgias"
              logo="G"
              description="Tickets de support, pour relier réclamations et ventes."
              connectedHint="Tickets Gorgias collectés."
              keyLabel="Identifiants Gorgias"
              keyHint="Format : domaine::email::cleApi"
              helpHref="https://developers.gorgias.com/reference/authentication"
              helpLabel="Créer une clé API"
              collectOnly
            />
          </CollapsedSection>
        </div>
      ) : (
        <UpgradeGate
          title="Connectez vos boutiques avec le plan Pro"
          message="Le plan Gratuit donne accès à la démo. Passez en Pro pour connecter Shopify, Stripe, Klaviyo et Google Analytics et analyser vos vraies données."
        />
      )}

      <Card>
        <EmptyState
          icon={Mail}
          title="Un outil manquant ?"
          description="Dites-nous lequel : les prochains connecteurs suivent les demandes."
          action={
            <a href={SUPPORT_MAILTO} className={buttonVariants({ size: "sm", variant: "ghost" })}>
              Écrire à Nightflow
            </a>
          }
        />
      </Card>
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
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-label uppercase tracking-[0.06em] text-ink3">{label}</h2>
        <p className="mt-0.5 text-label font-normal text-ink3">{hint}</p>
      </div>
      {children}
    </section>
  );
}

/** Same header, folded by default — for what the merchant rarely needs. */
function CollapsedSection({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 text-label uppercase tracking-[0.06em] text-ink3 transition hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-4 w-4 transition duration-base group-open:rotate-90"
          aria-hidden
        />
        {label}
      </summary>
      <p className="text-label font-normal text-ink3">{hint}</p>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}
