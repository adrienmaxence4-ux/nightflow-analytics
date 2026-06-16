-- ─────────────────────────────────────────────────────────────
-- Nightflow Analytics — Supabase schema (Phase 2)
-- Run this in the Supabase SQL editor once you connect your project.
-- The app works in demo mode without it.
-- ─────────────────────────────────────────────────────────────

-- Profiles: one row per authenticated user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  store_name text,
  plan text default 'Starter',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Connected data sources (Shopify, GA4, Meta, …)
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  status text default 'connected',
  access_token text,           -- encrypt at rest in production
  connected_at timestamptz default now()
);

alter table public.integrations enable row level security;

create policy "Users manage own integrations"
  on public.integrations for all
  using (auth.uid() = user_id);

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
