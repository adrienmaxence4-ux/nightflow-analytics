-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 009 : Accès VIP offerts
-- L'admin pré-autorise un email → le plan (Scale) s'active soit
-- immédiatement (compte existant, via l'API admin), soit automatiquement
-- à l'inscription (trigger ci-dessous). Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.vip_grants (
  email       text primary key,
  plan        text not null default 'scale' check (plan in ('pro', 'scale')),
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.vip_grants is
  'Accès offerts par l''admin (influenceurs/testeurs) — appliqués à l''inscription.';

alter table public.vip_grants enable row level security;
-- Service role uniquement (aucune policy publique).

-- Le trigger d'inscription crée le profil ET applique un éventuel accès VIP.
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

  -- Accès VIP pré-autorisé pour cet email → abonnement offert, actif.
  insert into public.subscriptions (user_id, plan, billing_interval, status)
  select new.id, v.plan, 'month', 'active'
  from public.vip_grants v
  where lower(v.email) = lower(new.email)
  on conflict (user_id) do update
    set plan = excluded.plan, status = 'active';

  return new;
end;
$$;
