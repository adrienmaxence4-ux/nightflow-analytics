-- ───────────────────────────────────────────────
-- Inscription détaillée + registre d'essai à deux clés (email ET domaine).
--
-- Jusqu'ici un essai gratuit n'était bloqué que par l'email normalisé : un
-- nouveau Gmail suffisait pour 30 jours de plus. Le domaine de la boutique
-- devient la seconde clé : recréer un compte demande aussi une autre boutique
-- en ligne, joignable (vérifié par la route avant l'appel RPC).
-- ───────────────────────────────────────────────

-- Domaine public de la boutique ("maboutique.fr"), normalisé par l'application
-- (minuscules, sans www ni chemin). Nullable : les comptes Google le
-- renseignent après coup dans Paramètres. La contrainte reprend la regex de
-- lib/signup.ts : la ligne est écrivable sous RLS par son propriétaire, un
-- domaine avec chemin ou majuscule ne doit pas pouvoir devenir une clé.
alter table public.stores
  add column if not exists domain text;
alter table public.stores
  drop constraint if exists stores_domain_is_host;
alter table public.stores
  add constraint stores_domain_is_host check (
    domain is null or (
      length(domain) <= 253
      and domain !~ '^www\.'
      and domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    )
  );

-- ── Registre v2 : une ligne par clé d'identité consommée ──
-- RLS activé SANS policy : aucun accès direct, seules les fonctions
-- SECURITY DEFINER ci-dessous y touchent.
create table if not exists public.trial_identities (
  kind       text not null check (kind in ('email', 'domain')),
  value      text not null,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (kind, value)
);
alter table public.trial_identities enable row level security;

-- Reprise des essais déjà consommés (registre v1, clé email seule). Le v1 est
-- supprimé en fin de fichier : le bloc est conditionnel pour rester rejouable.
do $$
begin
  if to_regclass('public.trial_ledger') is not null then
    insert into public.trial_identities (kind, value, user_id, created_at)
    select 'email', email_norm, user_id, created_at
    from public.trial_ledger
    on conflict do nothing;
  end if;
end
$$;

-- ── Réclamer l'essai et l'ouvrir, en une transaction ──
-- Tout vient du serveur : identité via auth.uid(), email et confirmation
-- depuis auth.users, domaine depuis la boutique de l'appelant. Rien n'est
-- fourni par le client. L'octroi (subscriptions.status = 'trialing') se fait
-- ici même : une clé ne peut pas être consommée sans que l'essai s'ouvre.
-- `p_domain` est le domaine que la route vient de tester en ligne : s'il ne
-- correspond plus à la boutique (changé entre le test et l'appel), on refuse
-- plutôt que de brûler une clé jamais vérifiée.
-- Codes rendus : ok | unauthenticated | email_unconfirmed | store_missing |
-- already_subscribed | already_used.
-- L'insertion des deux clés est SANS `on conflict` : deux réclamations
-- simultanées sur la même identité ne passent pas toutes les deux.
drop function if exists public.claim_pro_trial_v2();
create or replace function public.claim_pro_trial_v2(p_domain text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_norm      text;
  v_domain    text;
  v_ends      timestamptz := now() + interval '30 days';
begin
  if v_uid is null then
    return 'unauthenticated';
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
  from auth.users u
  where u.id = v_uid;

  if coalesce(v_email, '') = '' then
    return 'unauthenticated';
  end if;
  if v_confirmed is null then
    return 'email_unconfirmed';
  end if;

  if exists (
    select 1 from public.subscriptions s
    where s.user_id = v_uid
      and (s.status in ('active', 'trialing') or s.stripe_customer_id is not null)
  ) then
    return 'already_subscribed';
  end if;

  v_norm := public.normalize_email(v_email);

  select s.domain
    into v_domain
  from public.stores s
  where s.owner_id = v_uid and s.domain is not null
  order by s.created_at
  limit 1;

  if v_domain is null
     or v_domain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
     or v_domain ~ '^www\.'
     or (p_domain is not null and p_domain <> v_domain) then
    return 'store_missing';
  end if;

  if exists (
    select 1 from public.trial_identities t
    where t.user_id = v_uid
       or (t.kind = 'email'  and t.value = v_norm)
       or (t.kind = 'domain' and t.value = v_domain)
  ) then
    return 'already_used';
  end if;

  insert into public.trial_identities (kind, value, user_id)
  values ('email', v_norm, v_uid), ('domain', v_domain, v_uid);

  insert into public.subscriptions
    (user_id, plan, billing_interval, status, trial_ends_at, current_period_end,
     stripe_customer_id, stripe_subscription_id)
  values (v_uid, 'pro', 'month', 'trialing', v_ends, v_ends, null, null)
  on conflict (user_id) do update
    set plan = 'pro',
        billing_interval = 'month',
        status = 'trialing',
        trial_ends_at = excluded.trial_ends_at,
        current_period_end = excluded.current_period_end,
        stripe_customer_id = null,
        stripe_subscription_id = null;

  return 'ok';
end;
$$;

-- Ancienne signature conservée (booléen) pour le code déjà déployé : même
-- règle, même registre. À retirer quand plus rien ne l'appelle.
create or replace function public.claim_pro_trial()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.claim_pro_trial_v2() = 'ok';
$$;

-- ── Vérifier (lecture seule) si l'appelant a déjà consommé son essai ──
-- Ne teste que ses propres clés (compte et email). La clé domaine n'est
-- vérifiée qu'à la réclamation : l'exposer ici ferait de la fonction un
-- oracle (« ce domaine a-t-il déjà essayé Nightflow ? ») pour quiconque
-- l'inscrit sur sa propre boutique.
create or replace function public.has_used_trial()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trial_identities t
    where t.user_id = auth.uid()
       or (t.kind = 'email' and t.value = public.normalize_email(
             (select u.email from auth.users u where u.id = auth.uid())))
  );
$$;

revoke execute on function public.claim_pro_trial_v2(text) from public, anon;
revoke execute on function public.claim_pro_trial() from public, anon;
revoke execute on function public.has_used_trial() from public, anon;
grant execute on function public.claim_pro_trial_v2(text) to authenticated;
grant execute on function public.claim_pro_trial() to authenticated;
grant execute on function public.has_used_trial() to authenticated;

-- Le registre v1 n'est plus lu par personne.
drop table if exists public.trial_ledger;
