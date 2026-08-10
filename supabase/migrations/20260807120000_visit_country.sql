-- ───────────────────────────────────────────────
-- Pays des visiteurs, pour choisir la langue des publications.
--
-- On stocke UNIQUEMENT le code pays (2 lettres), fourni par l'en-tête
-- `x-vercel-ip-country`. Jamais l'adresse IP : c'est une donnée personnelle
-- (RGPD, arrêt Breyer), et la page Confidentialité du site promet qu'aucune
-- IP n'est conservée. Un code pays seul n'identifie personne.
-- ───────────────────────────────────────────────
alter table public.site_visits
  add column if not exists country text;

create index if not exists idx_site_visits_country
  on public.site_visits(country);
