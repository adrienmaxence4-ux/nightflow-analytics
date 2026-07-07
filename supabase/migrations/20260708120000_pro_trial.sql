-- ───────────────────────────────────────────────
-- Essai gratuit 30 jours — plan PRO uniquement (sans carte)
-- + protection anti-abus : un seul essai par identité (email normalisé).
-- ───────────────────────────────────────────────

-- Fin de l'essai (null = pas d'essai). L'entitlement se lit via status='trialing'.
alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;

-- ── Normalisation d'email : neutralise les alias (gmail "." et "+tag") ──
-- Sert de clé d'unicité pour empêcher un même utilisateur de recréer un
-- compte alias afin de re-déclencher un essai gratuit.
create or replace function public.normalize_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_local  text;
  v_domain text;
  v_at     int;
begin
  v_at := position('@' in v_email);
  if v_at = 0 then
    return v_email;
  end if;
  v_local  := substring(v_email from 1 for v_at - 1);
  v_domain := substring(v_email from v_at + 1);
  -- retirer l'alias "+quelquechose"
  if position('+' in v_local) > 0 then
    v_local := substring(v_local from 1 for position('+' in v_local) - 1);
  end if;
  -- gmail : les points sont ignorés + unifier le domaine
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local  := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;
  return v_local || '@' || v_domain;
end;
$$;

-- ── Registre des essais consommés ──
-- Une ligne par identité ayant déjà utilisé son essai gratuit. RLS activé SANS
-- policy : aucun accès direct (ni lecture ni écriture) pour les utilisateurs ;
-- seules les fonctions SECURITY DEFINER ci-dessous y touchent.
create table if not exists public.trial_ledger (
  email_norm text primary key,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.trial_ledger enable row level security;

-- ── Réclamer l'essai : insère l'identité de l'appelant si absente ──
-- L'email est dérivé du JWT (jamais fourni par le client) → impossible de
-- réclamer/griller l'essai d'autrui. Retourne true seulement si l'essai
-- n'avait jamais été utilisé pour cette identité.
create or replace function public.claim_pro_trial()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_norm  text;
begin
  if v_uid is null or v_email is null or v_email = '' then
    return false;
  end if;
  v_norm := public.normalize_email(v_email);
  insert into public.trial_ledger (email_norm, user_id)
  values (v_norm, v_uid)
  on conflict (email_norm) do nothing;
  return found; -- false si l'identité avait déjà consommé son essai
end;
$$;

-- ── Vérifier (lecture seule) si l'appelant a déjà utilisé son essai ──
create or replace function public.has_used_trial()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trial_ledger
    where email_norm = public.normalize_email(auth.jwt() ->> 'email')
  );
$$;

-- Exécution réservée aux utilisateurs authentifiés.
revoke execute on function public.claim_pro_trial() from public, anon;
revoke execute on function public.has_used_trial() from public, anon;
grant execute on function public.claim_pro_trial() to authenticated;
grant execute on function public.has_used_trial() to authenticated;
