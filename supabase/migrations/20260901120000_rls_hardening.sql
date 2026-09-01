-- ═══════════════════════════════════════════════════════════════
-- RLS hardening — audit findings A / B / C / D / E.
--
-- APPLIED TO PRODUCTION 2026-09-01 via the Supabase MCP, in two parts
-- (recorded there as `rls_hardening_subscriptions_integrations_applied_actions`
--  and `rls_hardening_column_grants_integrations_profiles`). This file is the
-- consolidated source of truth — deploy the matching app code first, then run.
--
-- NOTE: Supabase grants ALL on every public table to anon/authenticated and
-- relies on RLS as the gate, so a column-level `REVOKE (col)` is a no-op — the
-- table grant wins. To actually hide a column you must revoke the table
-- privilege and re-grant it on the safe columns only (see B and D).
-- ═══════════════════════════════════════════════════════════════

-- ── A. subscriptions — client may only READ its own row. ─────────────────────
-- Was FOR ALL / WITH CHECK (auth.uid() = user_id): any signed-in user could
-- POST {plan:"scale",status:"active"} for their own user_id and self-upgrade.
-- Writes now go through the service role only (Stripe webhook + /api/billing/*,
-- which verify the user + the Stripe session first).
drop policy if exists "subscriptions_owner" on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ── B. integrations — client may read a row but NOT its credential columns. ──
revoke select on public.integrations from anon, authenticated;
grant select (
  id, store_id, provider, status, metadata,
  connected_at, created_at, updated_at, last_synced_at, last_error
) on public.integrations to anon, authenticated;
-- access_token / refresh_token / token_expires_at are intentionally excluded.
-- Server code reads them with the service-role client.

-- ── C. applied_actions — a client INSERT may only create a fresh planned row. ─
-- Blocks fabricating a pre-"applied" row with a poisoned before_state (which
-- undo() would replay). executeAction()/undoAction() also re-validate the
-- price-change ceiling against the live price.
drop policy if exists "applied_actions_owner" on public.applied_actions;

create policy "applied_actions_owner"
  on public.applied_actions
  for all
  to authenticated
  using (owns_store(store_id) and auth.uid() = user_id)
  with check (owns_store(store_id) and auth.uid() = user_id and status = 'planned');

-- ── D. profiles — client may not write `plan` (entitlements come from
--        subscriptions; nothing reads profiles.plan). ────────────────────────
revoke update on public.profiles from anon, authenticated;
grant update (email, full_name, avatar_url, locale, timezone, currency)
  on public.profiles to anon, authenticated;

-- ── E. site_settings — keep the anon read (middleware maintenance check) but
--        scope the blanket `using (true)` to the single global flag row. ─────
drop policy if exists "site_settings_read" on public.site_settings;

create policy "site_settings_read"
  on public.site_settings
  for select
  to anon, authenticated
  using (id = 'global');

-- ── Storage — bound what the service-role pipeline can drop into the asset
--        buckets. (public=true is kept — CDN marketing assets.) ─────────────
update storage.buckets
set file_size_limit = 52428800,  -- 50 MB
    allowed_mime_types = array[
      'image/png','image/jpeg','image/webp','image/gif',
      'video/mp4','video/quicktime',
      'audio/mpeg','audio/wav','audio/mp4'
    ]
where id in ('nightflow-reel-assets','reel-assets','temp-voiceover');

-- NOT applied yet (held back — redundant while the buckets are public=true, and
-- a stray .list() on them would break). Drop once confirmed nothing lists them:
--   drop policy if exists "reel-assets public read temp" on storage.objects;
--   drop policy if exists "temp anon read reel assets" on storage.objects;

-- owns_store(): flagged by the linter as an exposed RPC, but it is used inside
-- ~10 RLS policies — revoking EXECUTE from `authenticated` breaks them all. Left
-- callable: no data in, boolean out, false for a caller without a session.
