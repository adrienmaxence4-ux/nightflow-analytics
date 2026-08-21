-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration : Actions autonomes
-- « Appliquer » : le SaaS exécute lui-même la recommandation sur
-- la boutique du client (Shopify / WooCommerce).
--
-- Chaque écriture passe par une ligne de cette table :
--   planned → applied → (undone | failed)
-- `before_state` est l'état EXACT lu sur la plateforme juste avant
-- l'écriture : c'est ce qui rend l'annulation possible.
-- Idempotent & non destructif.
-- ═══════════════════════════════════════════════════════════════

do $$ begin
  create type public.action_status as enum ('planned', 'applied', 'failed', 'undone');
exception when duplicate_object then null; end $$;

create table if not exists public.applied_actions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- Type d'action du catalogue (services/actions/catalog.ts).
  kind          text not null,
  -- Plateforme cible ('shopify', 'woocommerce').
  provider      text not null,
  -- Recommandation d'origine, pour la traçabilité (id non stable côté IA).
  source_ref    text,
  -- Résumé lisible affiché dans le journal : « Prix de X : 31,90 € → 27,90 € ».
  summary       text not null,
  params        jsonb not null default '{}'::jsonb,
  -- Ce que l'action va changer, calculé à la planification (label/avant/après).
  changes       jsonb not null default '[]'::jsonb,
  -- État lu sur la plateforme avant l'écriture → charge utile de l'annulation.
  before_state  jsonb not null default '{}'::jsonb,
  result        jsonb not null default '{}'::jsonb,
  status        public.action_status not null default 'planned',
  error         text,
  reversible    boolean not null default true,
  -- Un plan est à usage unique et périmé au bout de 15 min : on ne rejoue pas
  -- une écriture calculée sur un état de boutique qui a pu changer depuis.
  expires_at    timestamptz not null default (now() + interval '15 minutes'),
  executed_at   timestamptz,
  undone_at     timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_applied_actions_store
  on public.applied_actions(store_id, created_at desc);
create index if not exists idx_applied_actions_status
  on public.applied_actions(store_id, status, created_at desc);

alter table public.applied_actions enable row level security;

drop policy if exists "applied_actions_owner" on public.applied_actions;
create policy "applied_actions_owner"
  on public.applied_actions for all
  using (public.owns_store(store_id) and auth.uid() = user_id)
  with check (public.owns_store(store_id) and auth.uid() = user_id);
