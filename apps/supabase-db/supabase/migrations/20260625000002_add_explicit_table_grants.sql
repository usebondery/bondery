-- Explicit table-level grants migration.
--
-- Supabase is moving to an opt-in grant model: new tables in `public` are no
-- longer automatically granted SELECT/INSERT/UPDATE/DELETE to API roles.
-- After a db reset all migrations replay under this new default, so tables
-- exist and RLS policies exist but roles have no table-level privileges —
-- causing "permission denied for table people" on every Data API call.
--
-- This migration:
--   1. Revokes automatic future grants so new tables are never exposed by
--      accident (Supabase recommended pattern, changelog #45329).
--   2. Grants minimum necessary privileges per role per table:
--        - service_role  → full CRUD on every table (adminClient bypasses RLS
--                          for storage ops, geocode cache, webhooks, etc.)
--        - authenticated → CRUD on user-owned tables; read-only or no access
--                          on server-internal tables; all rows further
--                          constrained by existing RLS policies.
--        - anon          → no grants (Bondery uses OAuth-only login; there is
--                          no anonymous data access path).

-- ── 1. Stop future tables from being auto-exposed ────────────────────────────

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES
  FROM anon, authenticated, service_role;

-- ── 2. service_role — full CRUD on all 25 tables ─────────────────────────────
-- service_role is used by adminClient for: avatar storage, geocode cache,
-- subscription webhook upserts, reminder dispatch, and admin analytics RPCs.
-- It already bypasses RLS; grants here are required for the Data API layer.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.people,
  public.user_settings,
  public.groups,
  public.people_groups,
  public.interactions,
  public.interaction_participants,
  public.people_phones,
  public.people_emails,
  public.people_relationships,
  public.people_important_dates,
  public.people_socials,
  public.people_merge_recommendations,
  public.people_addresses,
  public.tags,
  public.people_tags,
  public.people_work_history,
  public.people_education_history,
  public.people_linkedin,
  public.linkedin_enrich_queue,
  public.chat_sessions,
  public.chat_messages,
  public.subscriptions,
  public.pending_subscriptions,
  public.geocode_cache,
  public.reminder_dispatch_log
TO service_role;

-- ── 3. authenticated — CRUD on user-owned tables ─────────────────────────────
-- Every authenticated request goes through verifySession. RLS policies
-- further restrict rows to the owning user (auth.uid() = user_id).

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.people,
  public.groups,
  public.people_groups,
  public.interactions,
  public.interaction_participants,
  public.people_phones,
  public.people_emails,
  public.people_relationships,
  public.people_important_dates,
  public.people_socials,
  public.people_merge_recommendations,
  public.people_addresses,
  public.tags,
  public.people_tags,
  public.people_work_history,
  public.people_education_history,
  public.people_linkedin,
  public.linkedin_enrich_queue,
  public.chat_sessions,
  public.chat_messages
TO authenticated;

-- user_settings: no DELETE — the row is only removed via auth.users CASCADE.
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;

-- subscriptions: read-only for authenticated.
-- All writes (upsert on webhook, sync) go through adminClient (service_role).
GRANT SELECT ON public.subscriptions TO authenticated;

-- geocode_cache: server-side shared cache accessed only via adminClient.
-- reminder_dispatch_log: cron-only, no user-facing reads or writes.
-- pending_subscriptions: webhook-only, no user-facing access.
-- → no grants to authenticated for these three tables.

-- ── 4. anon — no grants ──────────────────────────────────────────────────────
-- Bondery uses OAuth-only sign-in. The anon role is never the active role on
-- any Data API call. No table grants are needed or safe.
