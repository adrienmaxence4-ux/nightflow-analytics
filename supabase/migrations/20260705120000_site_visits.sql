-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 008 : Trafic du site (admin stats)
-- Comptage de visiteurs uniques par jour, sans cookie tiers ni PII :
-- un identifiant aléatoire local (localStorage) + la date. Écrit par
-- le service role uniquement (aucune policy publique). Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.site_visits (
  date        date not null default current_date,
  vid         text not null,
  created_at  timestamptz not null default now(),
  primary key (date, vid)
);

comment on table public.site_visits is
  'Visites uniques quotidiennes du site (vid = identifiant aléatoire local, aucune donnée personnelle).';

alter table public.site_visits enable row level security;
-- Pas de policies : lecture/écriture réservées au service role (API admin).
