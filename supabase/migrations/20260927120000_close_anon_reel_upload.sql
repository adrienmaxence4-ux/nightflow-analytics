-- ── Storage — close anonymous uploads to nightflow-reels ────────────────────
-- The bucket was created on 2026-09-02, the day after rls_hardening bounded the
-- other asset buckets, and shipped with an INSERT policy for `anon`: anyone
-- holding the public anon key could drop any file, of any size and type, into
-- a public bucket served from our Supabase domain (free malware / phishing
-- hosting). Its last upload was 2026-09-06 (three voice-over mp3s); nothing in
-- the repo writes to it. Public read stays: existing links keep working.
--
-- Rollback, if a pipeline turns out to need it — give it the service role
-- instead of re-opening anon:
--   create policy nightflow_reels_anon_insert on storage.objects
--     for insert to anon with check (bucket_id = 'nightflow-reels');

drop policy if exists nightflow_reels_anon_insert on storage.objects;

update storage.buckets
set file_size_limit = 52428800,  -- 50 MB, same bound as the other asset buckets
    allowed_mime_types = array[
      'image/png','image/jpeg','image/webp','image/gif',
      'video/mp4','video/quicktime',
      'audio/mpeg','audio/wav','audio/mp4'
    ]
where id = 'nightflow-reels';
