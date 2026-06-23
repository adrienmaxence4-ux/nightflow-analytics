-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 007 : Integration Engine
-- Token refresh fields, normalized event store, and a DB-backed job
-- queue (the Redis/BullMQ "equivalent" for our Vercel + Supabase stack).
-- Additive & idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── integrations: refresh + status lifecycle ──
alter table public.integrations
  add column if not exists refresh_token   text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_synced_at  timestamptz,
  add column if not exists last_error      text;

-- Allow the richer connection lifecycle (syncing / expired).
alter table public.integrations
  drop constraint if exists integrations_status_check;
alter table public.integrations
  add constraint integrations_status_check
  check (status in ('connected','disconnected','error','pending','syncing','expired'));

-- ── integration_events: unified, PII-free normalized events ──
create table if not exists public.integration_events (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  source      text not null,
  event_type  text not null,
  occurred_at timestamptz not null,
  metrics     jsonb not null default '{}'::jsonb,
  metadata    jsonb not null default '{}'::jsonb,
  -- "source:external_id" — lets webhooks + sync dedupe the same object.
  dedupe_key  text,
  created_at  timestamptz not null default now(),
  unique (store_id, dedupe_key)
);
create index if not exists idx_int_events_store_time
  on public.integration_events(store_id, occurred_at desc);

alter table public.integration_events enable row level security;
drop policy if exists "int_events_owner" on public.integration_events;
create policy "int_events_owner"
  on public.integration_events for select
  using (public.owns_store(store_id));
-- Writes happen from the service-role worker (RLS bypassed); no insert policy
-- for end users on purpose.

-- ── integration_jobs: DB-backed retry queue (webhooks + sync) ──
create table if not exists public.integration_jobs (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  provider     text not null,
  kind         text not null check (kind in ('webhook','sync')),
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
               check (status in ('pending','processing','done','failed')),
  attempts     integer not null default 0,
  max_attempts integer not null default 6,
  last_error   text,
  run_after    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_int_jobs_due
  on public.integration_jobs(status, run_after);

drop trigger if exists trg_int_jobs_updated_at on public.integration_jobs;
create trigger trg_int_jobs_updated_at
  before update on public.integration_jobs
  for each row execute function public.set_updated_at();

alter table public.integration_jobs enable row level security;
-- Internal worker table — no end-user policies (service role only).
