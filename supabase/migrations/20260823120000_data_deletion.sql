-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Demandes de suppression de données
--
-- Meta exige deux rappels avant tout App Review : désautorisation
-- et suppression de données. Le second doit renvoyer un code de
-- confirmation ET une URL où la personne peut suivre sa demande —
-- d'où cette table, qui existe uniquement pour rendre ce suivi
-- possible. Aucune donnée personnelle : seulement l'identifiant
-- opaque fourni par la plateforme.
-- Idempotent & non destructif.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.data_deletion_requests (
  -- Code communiqué à la personne, et seule clé de recherche publique.
  code          text primary key,
  -- "instagram", "meta"… la plateforme qui a émis la demande.
  provider      text not null,
  -- Identifiant opaque de l'utilisateur chez la plateforme. Jamais un email.
  external_id   text not null,
  -- Ce qui a réellement été supprimé, pour pouvoir le dire honnêtement.
  deleted       jsonb not null default '{}'::jsonb,
  status        text not null default 'completed'
                check (status in ('completed', 'partial', 'failed')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_deletion_external
  on public.data_deletion_requests(provider, external_id);

alter table public.data_deletion_requests enable row level security;
-- Aucune policy : écrit par le rappel Meta via le service role, lu par la
-- page publique de suivi via le service role également. Rien n'est exposé
-- aux utilisateurs connectés, et le code seul permet la consultation.
