"use client";

/**
 * BANC D'ESSAI TEMPORAIRE — à supprimer avant livraison.
 * Les 9 pages client vivent derrière un garde d'authentification ; cette route
 * publique rend le système de design isolé pour pouvoir le vérifier à l'écran.
 */

import { Package, WifiOff, TrendingUp, ShoppingCart, Users, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RecommendationsPanel } from "@/features/actions/recommendations-panel";
import type { Recommendation } from "@/types";

const KPIS = [
  { label: "Chiffre d'affaires", value: "12 480 €", delta: "+18,2 %", up: true, icon: TrendingUp, tone: "#3df2ff" },
  { label: "Commandes", value: "312", delta: "+6,4 %", up: true, icon: ShoppingCart, tone: "#9a6bff" },
  { label: "Visiteurs", value: "8 941", delta: "−2,1 %", up: false, icon: Users, tone: "#ff5cae" },
  { label: "Conversion", value: "3,49 %", delta: "+0,3 pt", up: true, icon: Percent, tone: "#7dffb0" },
];

/** Les deux états d'une recommandation : exécutable par Nightflow, ou manuelle. */
const RECOS: Recommendation[] = [
  {
    id: "lab-1",
    title: "Rupture de stock : Lampe Lune",
    detail: "0 unité en stock alors que le produit s'est vendu 40 fois.",
    impact: "≈ 1 276 € de ventes manquées",
    impactLevel: "high",
    cta: "Réassortir maintenant",
    effort: "Faible",
    priority: "CRITICAL",
    impactScore: 95,
    confidenceScore: 92,
    action: {
      kind: "product.stock.set",
      label: "Réassortir maintenant",
      preview: "Passer le stock de « Lampe Lune » à 20 unités",
      params: { productId: "11111111-1111-4111-8111-111111111111", quantity: 20 },
      editable: {
        field: "quantity",
        label: "Quantité à mettre en stock",
        value: 20,
        min: 0,
        max: 100000,
        step: 1,
        suffix: "unités",
      },
    },
  },
  {
    id: "lab-2",
    title: "Optimiser le tunnel de paiement mobile",
    detail: "Apple Pay absent et images non compressées sur le checkout.",
    impact: "+2 100 €/sem",
    impactLevel: "high",
    cta: "Optimiser",
    effort: "Moyen",
    priority: "HIGH",
    impactScore: 70,
    confidenceScore: 65,
  },
];

export default function UiLab() {
  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-8 p-6">
      <header>
        <h1 className="text-title">Banc d&apos;essai — système de design</h1>
        <p className="mt-1 text-body text-ink-mut">
          Vérification des tokens, primitives et états. Route temporaire.
        </p>
      </header>

      <Section title="Recommandations — exécutable vs manuelle">
        <RecommendationsPanel recommendations={RECOS} />
      </Section>

      <Section title="Échelle typographique — 5 tailles">
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-display">36 — display</p>
          <p className="text-title">22 — title</p>
          <p className="text-head">16 — head</p>
          <p className="text-body">14 — body, la taille par défaut de l&apos;interface</p>
          <p className="text-label text-ink-mut">12 — label / méta</p>
        </Card>
      </Section>

      <Section title="Grille KPI — cascade CSS, survol sans déplacement">
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} hover className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-label text-ink-dim">{k.label}</span>
                  <span
                    className="grid h-9 w-9 place-items-center rounded-sm border"
                    style={{ borderColor: `${k.tone}33`, background: `${k.tone}18` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: k.tone }} aria-hidden />
                  </span>
                </div>
                <div className="text-display" data-numeric>
                  {k.value}
                </div>
                <div
                  className={`mt-3 text-label ${k.up ? "text-neon-lime" : "text-neon-pinksoft"}`}
                  data-numeric
                >
                  {k.delta} <span className="text-ink-mut">vs période précédente</span>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Boutons — 5 variantes × 6 états">
        <Card className="flex flex-wrap items-center gap-3 p-5">
          <Button>Primaire</Button>
          <Button variant="pink">Rose</Button>
          <Button variant="ghost">Fantôme</Button>
          <Button variant="outline">Contour</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Chargement</Button>
          <Button disabled>Désactivé</Button>
          <Button size="sm" variant="ghost">
            Petit (40px + zone 48px)
          </Button>
        </Card>
      </Section>

      <Section title="Badges">
        <Card className="flex flex-wrap gap-2 p-5">
          <Badge variant="cyan">cyan</Badge>
          <Badge variant="violet">violet</Badge>
          <Badge variant="lime">lime</Badge>
          <Badge variant="amber">amber</Badge>
          <Badge variant="critical">critique</Badge>
          <Badge variant="warning">alerte</Badge>
          <Badge variant="positive">positif</Badge>
          <Badge variant="info">info</Badge>
        </Card>
      </Section>

      <Section title="Saisie — défaut, survol, focus, erreur">
        <Card className="grid gap-3 p-5 sm:grid-cols-2">
          <Input placeholder="Champ au repos" aria-label="Champ au repos" />
          <Input
            defaultValue="valeur invalide"
            aria-invalid="true"
            aria-label="Champ en erreur"
          />
        </Card>
      </Section>

      <Section title="Les 4 états de données">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <EmptyState
              icon={Package}
              title="Aucun produit synchronisé"
              description="Connectez votre boutique pour voir vos marges produit par produit."
              action={<Button size="sm">Connecter Shopify</Button>}
            />
          </Card>
          <Card>
            <ErrorState
              icon={WifiOff}
              description="La synchronisation Shopify n'a pas répondu. Vos données affichées datent d'hier."
              action={
                <Button size="sm" variant="ghost">
                  Réessayer
                </Button>
              }
            />
          </Card>
          <Card className="p-5">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-head text-ink-dim">{title}</h2>
      {children}
    </section>
  );
}
