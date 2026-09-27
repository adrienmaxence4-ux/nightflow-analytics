-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration : événements produit (entonnoir)
-- Un événement = un nom court + un visiteur (vid local aléatoire) et/ou un
-- utilisateur. Aucune PII, aucune IP : ce qu'il faut pour savoir où les
-- gens abandonnent (clic CTA → inscription → onboarding → source connectée
-- → premier brief → retour J1/J7), rien de plus. Écrit par le service role
-- uniquement (aucune policy publique), lu par l'API admin. Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.product_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  date        date not null default current_date,
  name        text not null check (name ~ '^[a-z][a-z0-9_]{1,39}$'),
  -- user_id when signed in, else vid: the key the funnel counts and dedupes on.
  actor       text not null check (char_length(actor) between 1 and 64),
  vid         text,
  -- cascade, not set null: a row keyed on a deleted account has no use left.
  user_id     uuid references auth.users (id) on delete cascade,
  props       jsonb not null default '{}'::jsonb
              check (pg_column_size(props) <= 256)
);

-- One row per actor, step and day (the API upserts with ignoreDuplicates).
create unique index if not exists product_events_day_name_actor_uidx
  on public.product_events (date, name, actor);
-- Retention: the API trims rows older than 90 days.
create index if not exists product_events_date_idx
  on public.product_events (date);

comment on table public.product_events is
  'Entonnoir produit : événements nommés par visiteur (vid local) et/ou utilisateur, sans donnée personnelle.';

create index if not exists product_events_name_date_idx
  on public.product_events (name, date desc);
create index if not exists product_events_user_date_idx
  on public.product_events (user_id, date desc)
  where user_id is not null;

alter table public.product_events enable row level security;
-- Pas de policies : lecture/écriture réservées au service role (API).
