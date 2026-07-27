-- ───────────────────────────────────────────────
-- Attribution des pubs : quelle publicité amène des visiteurs.
-- Un visiteur arrive avec ?a=CODE → on compte une visite pour ce code.
-- Même logique que site_visits : une ligne par (jour, code, visiteur),
-- la clé primaire fait la déduplication. Aucune donnée personnelle.
-- ───────────────────────────────────────────────
create table if not exists public.ad_visits (
  date       date not null default current_date,
  code       text not null,
  vid        text not null,
  created_at timestamptz not null default now(),
  primary key (date, code, vid)
);

create index if not exists idx_ad_visits_code on public.ad_visits(code);

alter table public.ad_visits enable row level security;
-- Aucune policy : écriture par le service role (/api/track), lecture par la
-- route admin (service role également). Rien n'est exposé aux utilisateurs.
