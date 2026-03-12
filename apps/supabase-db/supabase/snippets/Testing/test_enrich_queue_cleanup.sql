-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ✏️  CONFIG — optionally set a target email, then run this script   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════
-- Test helper: seed stale + fresh enrich queue rows for a user and call
-- cleanup_stale_enrich_queue() to verify correct behaviour.
--
-- Expected result:
--   - The 3 stale rows (pending / processing / completed / failed, all
--     backdated 8 days) are deleted.
--   - The 1 fresh pending row (updated_at = now) is NOT deleted.
--   - Deleted count returned by the function = 4.
--
-- Usage:
-- 1) Set target_email in the DECLARE block below to the user's email.
--    Leave it empty ('') to automatically pick the first user in auth.users.
-- 2) Run with a privileged role (service role / postgres).
-- 3) The transaction is rolled back at the end — no permanent data changes.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TEMP TABLE _test_target_user (
  user_id uuid PRIMARY KEY
) ON COMMIT DROP;

CREATE TEMP TABLE _test_queue_ids (
  row_id uuid PRIMARY KEY,
  label text
) ON COMMIT DROP;

DO $$
DECLARE
  -- ✏️  Set your email here, or leave empty to use the first user
  target_email  text := '';

  target_user_id uuid;
  resolved_email text;

  -- We need a real person_id to satisfy the FK. Grab the first person for this user.
  sample_person_ids uuid[];
  stale_ts timestamptz := now() - interval '8 days';

  inserted_ids uuid[];
BEGIN
  -- ── Resolve user ────────────────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    RAISE EXCEPTION
      E'No users found in auth.users.\nCreate an account first then re-run this script.';
  END IF;

  IF target_email IS NOT NULL AND trim(target_email) <> '' THEN
    SELECT id, email
      INTO target_user_id, resolved_email
    FROM auth.users
    WHERE email = trim(target_email)
    LIMIT 1;

    IF target_user_id IS NULL THEN
      RAISE EXCEPTION 'No auth user found with email "%". Sign up first.', trim(target_email);
    END IF;
  ELSE
    SELECT id, email
      INTO target_user_id, resolved_email
    FROM auth.users
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    RAISE NOTICE 'No email configured — using first user: % (%)', resolved_email, target_user_id;
  END IF;

  RAISE NOTICE 'Running enrich-queue cleanup test for user % (%)', resolved_email, target_user_id;

  INSERT INTO _test_target_user (user_id) VALUES (target_user_id);

  -- ── Gather person IDs (need 5 distinct ones for 5 queue rows) ───────────────

  SELECT array_agg(id ORDER BY created_at, id)
    INTO sample_person_ids
  FROM (
    SELECT id, created_at FROM public.people
    WHERE user_id = target_user_id
    ORDER BY created_at, id
    LIMIT 5
  ) sub;

  IF array_length(sample_person_ids, 1) < 5 THEN
    RAISE EXCEPTION
      'Need at least 5 people rows for user % to seed test data. Add more contacts first.',
      target_user_id;
  END IF;

  -- ── Seed stale rows (updated_at = 8 days ago) ───────────────────────────────
  -- Insert one of each status. The function only looks for pending/processing
  -- to identify stale users, but should delete all 4 rows.

  WITH ins AS (
    INSERT INTO public.linkedin_enrich_queue
      (user_id, person_id, status, created_at, updated_at)
    VALUES
      (target_user_id, sample_person_ids[1], 'pending',    stale_ts, stale_ts),
      (target_user_id, sample_person_ids[2], 'processing', stale_ts, stale_ts),
      (target_user_id, sample_person_ids[3], 'completed',  stale_ts, stale_ts),
      (target_user_id, sample_person_ids[4], 'failed',     stale_ts, stale_ts)
    RETURNING id
  )
  INSERT INTO _test_queue_ids (row_id, label)
  SELECT id, 'stale' FROM ins;

  -- ── Seed fresh row (updated_at = now) ───────────────────────────────────────
  -- This row must survive the cleanup because it was updated recently.

  WITH ins AS (
    INSERT INTO public.linkedin_enrich_queue
      (user_id, person_id, status, created_at, updated_at)
    VALUES
      (target_user_id, sample_person_ids[5], 'pending', now(), now())
    RETURNING id
  )
  INSERT INTO _test_queue_ids (row_id, label)
  SELECT id, 'fresh' FROM ins;

  RAISE NOTICE 'Seeded 4 stale rows and 1 fresh row for user %', resolved_email;
END;
$$;

-- ── Inspect seeded rows before cleanup ──────────────────────────────────────

SELECT
  q.id,
  q.status,
  q.updated_at,
  t.label,
  (q.updated_at < now() - interval '7 days') AS is_stale
FROM public.linkedin_enrich_queue q
JOIN _test_queue_ids t ON t.row_id = q.id
ORDER BY t.label DESC, q.status;

-- ── Run the cleanup function ─────────────────────────────────────────────────

SELECT public.cleanup_stale_enrich_queue() AS deleted_count;
-- Expected: 4 (the 4 stale rows, all statuses)

-- ── Verify surviving rows ────────────────────────────────────────────────────
-- Only the fresh pending row should remain.

SELECT
  q.id,
  q.status,
  q.updated_at,
  t.label
FROM public.linkedin_enrich_queue q
JOIN _test_queue_ids t ON t.row_id = q.id
ORDER BY t.label;
-- Expected: 1 row with label = 'fresh', status = 'pending'

-- ── Confirm cron job is registered ──────────────────────────────────────────

SELECT
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'cleanup-stale-enrich-queue';

ROLLBACK;
-- All seeded rows are removed; no permanent changes to the database.
