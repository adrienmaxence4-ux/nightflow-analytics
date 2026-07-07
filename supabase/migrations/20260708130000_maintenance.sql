-- ───────────────────────────────────────────────
-- Mode maintenance : interrupteur global piloté par l'admin.
-- Une seule ligne ('global'). Lisible publiquement (simple booléen non
-- sensible) pour que le middleware puisse l'évaluer avec la clé anon ;
-- écriture réservée au service role (route admin).
-- ───────────────────────────────────────────────
create table if not exists public.site_settings (
  id          text primary key default 'global',
  maintenance boolean not null default false,
  updated_at  timestamptz not null default now()
);

insert into public.site_settings (id) values ('global')
  on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- Lecture ouverte (le flag n'est pas confidentiel) ; aucune policy d'écriture
-- → seules les écritures service-role (route /api/admin/maintenance) passent.
drop policy if exists "site_settings_read" on public.site_settings;
create policy "site_settings_read"
  on public.site_settings for select
  using (true);
