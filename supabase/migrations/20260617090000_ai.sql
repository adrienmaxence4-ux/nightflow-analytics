-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 004 : AI Copilot
-- Conversations, messages, analysis history, AI recommendations.
-- Idempotent & non destructif. RLS obligatoire.
-- ═══════════════════════════════════════════════════════════════

-- Priority enum (LOW / MEDIUM / HIGH / CRITICAL)
do $$ begin
  create type public.ai_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
exception when duplicate_object then null; end $$;

-- ───────────────────────────────────────────────
-- ai_conversations (one chat thread per user)
-- ───────────────────────────────────────────────
create table if not exists public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  store_id    uuid references public.stores(id) on delete set null,
  title       text not null default 'Conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_ai_conv_user on public.ai_conversations(user_id, updated_at desc);

drop trigger if exists trg_ai_conv_updated_at on public.ai_conversations;
create trigger trg_ai_conv_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

alter table public.ai_conversations enable row level security;

drop policy if exists "ai_conv_own" on public.ai_conversations;
create policy "ai_conv_own"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- ai_messages (turns within a conversation)
-- ───────────────────────────────────────────────
create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_ai_msg_conv on public.ai_messages(conversation_id, created_at);

alter table public.ai_messages enable row level security;

drop policy if exists "ai_msg_own" on public.ai_messages;
create policy "ai_msg_own"
  on public.ai_messages for all
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

-- ───────────────────────────────────────────────
-- ai_analysis_history (cached generated analyses)
-- ───────────────────────────────────────────────
create table if not exists public.ai_analysis_history (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  kind        text not null check (kind in ('insights', 'anomalies', 'recommendations', 'summary')),
  payload     jsonb not null default '[]'::jsonb,
  model       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ai_analysis_store on public.ai_analysis_history(store_id, kind, created_at desc);

alter table public.ai_analysis_history enable row level security;

drop policy if exists "ai_analysis_owner" on public.ai_analysis_history;
create policy "ai_analysis_owner"
  on public.ai_analysis_history for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- ───────────────────────────────────────────────
-- ai_recommendations (prioritised AI recommendations)
-- ───────────────────────────────────────────────
create table if not exists public.ai_recommendations (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  title             text not null,
  detail            text,
  impact            text,
  priority          public.ai_priority not null default 'MEDIUM',
  impact_score      integer not null default 50 check (impact_score between 0 and 100),
  confidence_score  integer not null default 70 check (confidence_score between 0 and 100),
  status            text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_ai_reco_store on public.ai_recommendations(store_id, priority, created_at desc);

alter table public.ai_recommendations enable row level security;

drop policy if exists "ai_reco_owner" on public.ai_recommendations;
create policy "ai_reco_owner"
  on public.ai_recommendations for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));
