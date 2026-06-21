-- ───────────────────────────────────────────────
-- Table : subscriptions (abonnement SaaS par utilisateur)
-- Source de vérité du plan (free/pro/scale) alimentée après paiement Stripe.
-- ───────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  plan                   text not null default 'free'
                           check (plan in ('free', 'pro', 'scale')),
  billing_interval       text not null default 'month'
                           check (billing_interval in ('month', 'year')),
  status                 text not null default 'active',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
create index if not exists idx_subscriptions_customer
  on public.subscriptions(stripe_customer_id);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_owner" on public.subscriptions;
create policy "subscriptions_owner"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
