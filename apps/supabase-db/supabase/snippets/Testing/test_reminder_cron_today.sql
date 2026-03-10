-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ✏️  CONFIG — optionally set a target email, then run this script   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════
-- Test helper: force one user's reminder to be due "now" and run the
-- hourly cron function.
--
-- Usage:
-- 1) Set target_email in the DECLARE block below to the user's email.
--    Leave it empty ('') to automatically pick the first user in auth.users.
-- 2) Run with a privileged role (service role / postgres).
--
-- Notes:
-- - Requires at least one row in public.people_important_dates for the user.
-- - If the vault secret next_public_api_url is missing,
--   the function returns an error payload (expected) and no dispatch log row
--   is written.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TEMP TABLE _test_target_user (
  user_id uuid PRIMARY KEY
) ON COMMIT DROP;

DO $$
DECLARE
  -- ✏️  Set your email here, or leave empty to use the first user
  target_email  text := '';

  target_user_id uuid;
  resolved_email text;
  target_event_id uuid;
  effective_timezone text;
  local_today date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    RAISE EXCEPTION
      E'No users found in auth.users.\nCreate an account first by logging in to the webapp, then re-run this script.';
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

  RAISE NOTICE 'Running cron test for user % (%)', resolved_email, target_user_id;

  INSERT INTO _test_target_user (user_id)
  VALUES (target_user_id);

  SELECT e.id
  INTO target_event_id
  FROM public.people_important_dates e
  WHERE e.user_id = target_user_id
  ORDER BY e.created_at ASC, e.id ASC
  LIMIT 1;

  IF target_event_id IS NULL THEN
    RAISE EXCEPTION 'No people_important_dates found for user %.', target_user_id;
  END IF;

  SELECT COALESCE(tz.name, 'UTC')
  INTO effective_timezone
  FROM public.user_settings us
  LEFT JOIN pg_timezone_names tz
    ON tz.name = us.timezone
  WHERE us.user_id = target_user_id
  LIMIT 1;

  IF effective_timezone IS NULL THEN
    effective_timezone := 'UTC';
  END IF;

  local_today := timezone(effective_timezone, now())::date;

  UPDATE public.people_important_dates
  SET
    notify_days_before = 1,
    notify_on = local_today,
    updated_at = now()
  WHERE id = target_event_id;

  UPDATE public.user_settings us
  SET
    next_reminder_at_utc = now() - interval '5 minutes',
    updated_at = now()
  FROM _test_target_user t
  WHERE us.user_id = t.user_id;

  RAISE NOTICE 'Prepared user %, timezone %, local date %, event %',
    resolved_email,
    effective_timezone,
    local_today,
    target_event_id;
END;
$$;

-- Optional diagnostics before execution
SELECT
  us.user_id,
  us.timezone,
  us.reminder_send_hour,
  us.next_reminder_at_utc,
  now() AS run_started_at,
  (us.next_reminder_at_utc <= now()) AS is_due_now
FROM public.user_settings us
JOIN _test_target_user t
  ON t.user_id = us.user_id;

-- Verify vault secrets are present (secrets are read by send_hourly_reminder_digests via vault.decrypted_secrets)
SELECT
  name,
  description,
  (decrypted_secret IS NOT NULL AND decrypted_secret <> '') AS has_value,
  CASE WHEN name = 'next_public_api_url'
    THEN rtrim(decrypted_secret, '/') || '/api/reminders/daily-digest'
    ELSE NULL
  END AS reminder_digest_url,
  updated_at
FROM vault.decrypted_secrets
WHERE name = 'next_public_api_url';

SELECT
  e.id,
  e.user_id,
  e.person_id,
  e.type,
  e.date,
  e.notify_days_before,
  e.notify_on
FROM public.people_important_dates e
JOIN _test_target_user t
  ON t.user_id = e.user_id
WHERE e.notify_days_before IS NOT NULL
ORDER BY e.notify_on ASC, e.date ASC;

-- Execute hourly reminder dispatcher
SELECT public.send_hourly_reminder_digests() AS run_result;

-- Inspect most recent dispatch log rows for the same user
SELECT
  log.id,
  log.user_id,
  log.reminder_date,
  log.timezone,
  log.created_at
FROM public.reminder_dispatch_log log
JOIN _test_target_user t
  ON t.user_id = log.user_id
ORDER BY log.created_at DESC
LIMIT 10;

COMMIT;
