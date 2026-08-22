-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Visibilité vitrine des produits
--
-- `published` reflète si le produit est en ligne sur la boutique.
-- Alimenté par la synchronisation (Shopify status = active,
-- WooCommerce status = publish) et lu/écrit par l'action
-- « product.unpublish ».
-- Idempotent & non destructif : par défaut tout est en ligne, ce qui
-- correspond à l'état des catalogues déjà synchronisés.
-- ═══════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists published boolean not null default true;

create index if not exists idx_products_published
  on public.products(store_id, published);
