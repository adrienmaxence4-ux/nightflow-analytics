-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 003 : Intelligence
-- Insights IA, recommandations, notifications, intégrations.
-- Idempotent & non destructif.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- Enums
-- ───────────────────────────────────────────────
do $$ begin
  create type public.severity_level as enum ('critical', 'warning', 'positive', 'info');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.impact_level as enum ('high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('stock', 'sales', 'ads', 'system', 'ai');
exception when duplicate_object then null; end $$;

-- ───────────────────────────────────────────────
-- Table : insights (narratif Quoi / Pourquoi / Action)
-- ───────────────────────────────────────────────
create table if not exists public.insights (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  severity    public.severity_level not null default 'info',
  icon        text default '✨',
  what        text not null,
  why         text not null,
  action      text not null,
  impact      text,
  source      text,
  status      text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_insights_store on public.insights(store_id, created_at desc);
create index if not exists idx_insights_severity on public.insights(store_id, severity);

alter table public.insights enable row level security;

drop policy if exists "insights_store_owner" on public.insights;
create policy "insights_store_owner"
  on public.insights for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- ───────────────────────────────────────────────
-- Table : recommendations
-- ───────────────────────────────────────────────
create table if not exists public.recommendations (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  title         text not null,
  detail        text,
  impact        text,
  impact_level  public.impact_level not null default 'medium',
  cta           text default 'Appliquer',
  effort        text default 'Moyen',
  status        text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_reco_store on public.recommendations(store_id, created_at desc);

alter table public.recommendations enable row level security;

drop policy if exists "reco_store_owner" on public.recommendations;
create policy "reco_store_owner"
  on public.recommendations for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- ───────────────────────────────────────────────
-- Table : notifications (par utilisateur)
-- ───────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  store_id    uuid references public.stores(id) on delete cascade,
  type        public.notification_type not null default 'system',
  severity    public.severity_level not null default 'info',
  icon        text default '🔔',
  title       text not null,
  body        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- Table : integrations (sources de données connectées)
-- NB : en production, chiffrer access_token via Supabase Vault.
-- ───────────────────────────────────────────────
create table if not exists public.integrations (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  provider      text not null,
  status        text not null default 'disconnected'
                check (status in ('connected', 'disconnected', 'error', 'pending')),
  access_token  text,
  metadata      jsonb not null default '{}'::jsonb,
  connected_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (store_id, provider)
);
create index if not exists idx_integrations_store on public.integrations(store_id);

drop trigger if exists trg_integrations_updated_at on public.integrations;
create trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

alter table public.integrations enable row level security;

drop policy if exists "integrations_store_owner" on public.integrations;
create policy "integrations_store_owner"
  on public.integrations for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));
