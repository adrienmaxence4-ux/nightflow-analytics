-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 001 : Cœur (auth, profils)
-- Idempotent & non destructif. Sûr à rejouer.
-- ═══════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists pgcrypto with schema public;

-- ───────────────────────────────────────────────
-- Fonction générique : maintien automatique de updated_at
-- ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────────────────────────
-- Table : profiles (1 ligne par utilisateur auth)
-- ───────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'Starter' check (plan in ('Starter', 'Pro', 'Scale')),
  locale      text not null default 'fr',
  timezone    text not null default 'Europe/Paris',
  currency    text not null default 'EUR',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif lié à un utilisateur Supabase Auth.';

-- updated_at trigger
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ───────────────────────────────────────────────
-- Création automatique du profil à l'inscription
-- ───────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
