-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 010 : Codes VIP (liens d'invitation)
-- Un lien /signup?vip=CODE active automatiquement le plan offert à
-- l'inscription. Usage plafonné par code (anti-fuite). Idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.vip_codes (
  code        text primary key,
  plan        text not null default 'scale' check (plan in ('pro', 'scale')),
  note        text,
  max_uses    integer not null default 5,
  uses        integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.vip_codes is
  'Codes d''invitation VIP — le plan s''active automatiquement via /signup?vip=CODE.';

alter table public.vip_codes enable row level security;
-- Service role uniquement (validation côté API).

-- Pack fondateur : un code par cible + un générique.
insert into public.vip_codes (code, plan, note, max_uses) values
  ('ANTOINE',  'scale', 'Antoine BM',                 3),
  ('STAN',     'scale', 'Stan Leloup — Marketing Mania', 3),
  ('OSEILLE',  'scale', 'Oseille TV',                 3),
  ('YOMI',     'scale', 'Yomi Denzel',                3),
  ('PANIER',   'scale', 'Laurent Kretz — Le Panier',  3),
  ('FONDATEUR','scale', 'Invitations générales (micro-créateurs)', 25)
on conflict (code) do nothing;
