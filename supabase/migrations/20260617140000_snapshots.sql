-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 005 : Colonnes snapshot
-- Champs dénormalisés (pré-calculés) pour un affichage direct sans
-- agrégation lourde. Additif & idempotent — aucune donnée cassée.
-- ═══════════════════════════════════════════════════════════════

-- Produits : ventes / revenu / part du CA (snapshot période courante)
alter table public.products
  add column if not exists sales integer not null default 0,
  add column if not exists revenue_cents integer not null default 0,
  add column if not exists revenue_share numeric(5,2) not null default 0;

-- Campagnes : tendance + variation (snapshot)
alter table public.campaigns
  add column if not exists trend public.trend_dir not null default 'up',
  add column if not exists delta text;
