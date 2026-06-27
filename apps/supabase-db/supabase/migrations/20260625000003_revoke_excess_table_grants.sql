-- Revoke excess table grants left by a broad manual hotfix.
--
-- Migration 20260625000002 added the correct explicit grants but Postgres does
-- not remove pre-existing ones. This migration strips the over-broad privileges
-- from roles that should not have them, bringing the remote into the same
-- state as a fresh db reset.

-- ── anon — revoke all data-access privileges on every table ──────────────────
-- Bondery uses OAuth-only sign-in; the anon role is never active on any
-- Data API call, so it should have zero CRUD on any table.

REVOKE SELECT, INSERT, UPDATE, DELETE ON
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
FROM anon;

-- ── authenticated — revoke data-access on server-internal tables ─────────────
-- These three tables are accessed only via adminClient (service_role key).
-- Authenticated users have no legitimate read or write path to them.

REVOKE SELECT, INSERT, UPDATE, DELETE ON
  public.geocode_cache,
  public.reminder_dispatch_log,
  public.pending_subscriptions
FROM authenticated;

-- ── authenticated — subscriptions: keep SELECT, revoke write ops ─────────────
-- Reads are needed for /api/subscriptions status check (authenticated client).
-- All writes go through adminClient (Polar webhook, sync route).

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;

-- ── authenticated — user_settings: keep SELECT/INSERT/UPDATE, revoke DELETE ──
-- The settings row is created by the handle_new_user() trigger and removed
-- only via auth.users CASCADE. Authenticated code never deletes it directly.

REVOKE DELETE ON public.user_settings FROM authenticated;
