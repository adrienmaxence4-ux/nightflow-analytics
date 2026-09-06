-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 019 : Avis des visiteurs
--
-- Remplace le widget de retours d'un tiers : la donnée vit ici, pas
-- chez un prestataire, et se lit depuis /admin.
--
-- Aucune donnée personnelle obligatoire : la note suffit, le prénom
-- est facultatif et libre. Ni e-mail, ni IP, ni identifiant de suivi
-- — un avis n'a pas à être rattachable à quelqu'un.
--
-- Comme site_visits : RLS activé et AUCUNE policy. Rien ne passe
-- hors de /api/feedback (écriture, limitée en débit) et
-- /api/admin/feedback (lecture et modération). La clé anon publique
-- ne peut donc ni insérer ni lire directement. Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.site_feedback (
  id          uuid primary key default gen_random_uuid(),
  rating      smallint    not null check (rating between 1 and 5),
  comment     text        check (comment is null or char_length(comment) <= 1000),
  name        text        check (name is null or char_length(name) <= 40),
  page        text        check (page is null or char_length(page) <= 200),
  -- new      : reçu, pas encore relu
  -- published: bon pour être affiché en preuve sociale sur la landing
  -- hidden   : écarté (hors sujet, spam) sans être supprimé
  status      text        not null default 'new'
              check (status in ('new', 'published', 'hidden')),
  created_at  timestamptz not null default now()
);

comment on table public.site_feedback is
  'Avis laissés par les visiteurs du site public. Aucune donnée personnelle obligatoire.';
comment on column public.site_feedback.name is
  'Prénom facultatif, saisi librement par le visiteur. Jamais déduit ni complété.';
comment on column public.site_feedback.page is
  'Chemin de la page depuis laquelle l''avis a été laissé (sans paramètres).';

-- L'admin lit toujours du plus récent au plus ancien.
create index if not exists site_feedback_created_idx
  on public.site_feedback (created_at desc);

-- Et filtre par statut pour la modération / la sélection des avis publiés.
create index if not exists site_feedback_status_idx
  on public.site_feedback (status, created_at desc);

alter table public.site_feedback enable row level security;
-- Pas de policies : lecture/écriture réservées au service role (routes API).
