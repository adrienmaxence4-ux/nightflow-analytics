-- ═══════════════════════════════════════════════════════════════
-- RLS hardening — close client-writable columns that grant privilege.
-- Audit findings A / B / C / D / E + storage.
--
-- Requires the matching code change (billing + integration token reads move to
-- the service-role client). Deploy the app first, then run this.
-- ═══════════════════════════════════════════════════════════════

-- ── A. subscriptions — the client may only READ its own row. ──────────────────
-- Was: FOR ALL / WITH CHECK (auth.uid() = user_id) → any signed-in user could
--   POST {plan:"scale",status:"active"} for their own user_id and self-upgrade.
-- Now: SELECT only. Every write goes through the service role (Stripe webhook +
--   the /api/billing/* routes, which already verify the user + the Stripe
--   session before writing).
drop policy if exists "subscriptions_owner" on public.subscriptions;

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ── B. integrations — hide the credential columns from the client. ────────────
-- The row-owner could `select access_token` and read the stored OAuth / API
-- tokens (ciphertext, or plaintext if INTEGRATIONS_ENC_KEY is unset).
-- PostgREST enforces column privileges, so revoking SELECT on those columns
-- makes `?select=access_token` fail while leaving the rest of the row readable.
-- The RLS policy is unchanged; server code reads tokens via the service role.
revoke select (access_token, refresh_token, token_expires_at)
  on public.integrations from anon, authenticated;

-- ── C. applied_actions — a client INSERT may only create a fresh planned row. ─
-- Prevents fabricating a pre-"applied" row with a poisoned before_state (which
-- undo() would then replay). Combined with the re-validation added to
-- executeAction()/undoAction(), a hand-crafted plan can no longer bypass the
-- price-change ceiling.
drop policy if exists "applied_actions_owner" on public.applied_actions;

create policy "applied_actions_owner"
  on public.applied_actions
  for all
  to authenticated
  using (owns_store(store_id) and auth.uid() = user_id)
  with check (owns_store(store_id) and auth.uid() = user_id and status = 'planned');

-- ── D. profiles.plan — not client-writable (entitlements come from
--        subscriptions; profiles.plan is display-only and should mirror it). ──
revoke update (plan) on public.profiles from anon, authenticated;

-- ── E. site_settings — keep the anonymous read (the middleware reads the
--        maintenance flag pre-auth with the anon key) but scope the blanket
--        `using (true)` to just the global flag row, so a future row can't be
--        world-readable by accident. ─────────────────────────────────────────
drop policy if exists "site_settings_read" on public.site_settings;

create policy "site_settings_read"
  on public.site_settings
  for select
  to anon, authenticated
  using (id = 'global');

-- NOTE on owns_store(): the linter (0028/0029) flags it as callable via
-- /rest/v1/rpc/owns_store, but it is used inside ~10 RLS policies — revoking
-- EXECUTE from `authenticated` would break every store-scoped policy. It is left
-- callable: it takes no data, returns only a boolean, and for a caller without a
-- session (or for a store they don't own) it returns false. Accepted risk.

-- ── Storage ────────────────────────────────────────────────────────────────
-- Redundant "temp" read policies (the buckets are already public=true).
drop policy if exists "reel-assets public read temp" on storage.objects;
drop policy if exists "temp anon read reel assets" on storage.objects;

-- Bound what the service-role pipeline can drop into these buckets.
update storage.buckets
set file_size_limit = 52428800,  -- 50 MB
    allowed_mime_types = array[
      'image/png','image/jpeg','image/webp','image/gif',
      'video/mp4','video/quicktime',
      'audio/mpeg','audio/wav','audio/mp4'
    ]
where id in ('nightflow-reel-assets','reel-assets','temp-voiceover');
-- NOTE: buckets stay public=true (served as marketing assets over CDN). If any
-- private data ever lands here, flip public=false and switch the video/reel
-- pipeline + /admin/reels to createSignedUrl().
