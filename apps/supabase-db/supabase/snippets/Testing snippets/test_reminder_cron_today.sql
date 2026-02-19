-- Test helper: force one user's reminder to be due "now" and run the hourly cron function.
--
-- Run as postgres/service role in Supabase SQL Editor.
--
-- Notes:
-- - Prefers a non-seed user (email != seed@usebondery.local).
-- - Falls back to the only auth user when only one user exists.
-- - Requires at least one row in public.people_important_events for the chosen user.
-- - If app.settings.next_public_api_url / app.settings.private_bondery_supabase_http_key are missing,
--   the function returns an error payload (expected) and no dispatch log row is written.

BEGIN;

CREATE TEMP TABLE _test_target_user (
  user_id uuid PRIMARY KEY
) ON COMMIT DROP;

DO $$
DECLARE
  target_user_id uuid;
  non_seed_count integer;
  total_count integer;
  target_event_id uuid;
  effective_timezone text;
  local_today date;
BEGIN
  SELECT COUNT(*)::integer
  INTO non_seed_count
  FROM auth.users
  WHERE COALESCE(email, '') <> 'seed@usebondery.local';

  SELECT COUNT(*)::integer
  INTO total_count
  FROM auth.users;

  IF non_seed_count = 1 THEN
    SELECT id
    INTO target_user_id
    FROM auth.users
    WHERE COALESCE(email, '') <> 'seed@usebondery.local'
    ORDER BY created_at ASC, id ASC
    LIMIT 1;
  ELSIF non_seed_count = 0 AND total_count = 1 THEN
    SELECT id
    INTO target_user_id
    FROM auth.users
    ORDER BY created_at ASC, id ASC
    LIMIT 1;
  ELSE
    RAISE EXCEPTION
      'Could not determine a single test user automatically (non-seed: %, total: %).',
      non_seed_count,
      total_count;
  END IF;

  INSERT INTO _test_target_user (user_id)
  VALUES (target_user_id);

  SELECT e.id
  INTO target_event_id
  FROM public.people_important_events e
  WHERE e.user_id = target_user_id
  ORDER BY e.created_at ASC, e.id ASC
  LIMIT 1;

  IF target_event_id IS NULL THEN
    RAISE EXCEPTION 'No people_important_events found for user %.', target_user_id;
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

  UPDATE public.people_important_events
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
    target_user_id,
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
  (us.next_reminder_at_utc <= now()) AS is_due_now,
  current_setting('app.settings.next_public_api_url', true) AS next_public_api_url,
  current_setting('app.settings.private_bondery_supabase_http_key', true) IS NOT NULL AS has_supabase_http_key,
  rtrim(COALESCE(current_setting('app.settings.next_public_api_url', true), ''), '/') || '/api/reminders/daily-digest' AS reminder_digest_url
FROM public.user_settings us
JOIN _test_target_user t
  ON t.user_id = us.user_id;

SELECT
  e.id,
  e.user_id,
  e.person_id,
  e.event_type,
  e.event_date,
  e.notify_days_before,
  e.notify_on
FROM public.people_important_events e
JOIN _test_target_user t
  ON t.user_id = e.user_id
WHERE e.notify_days_before IS NOT NULL
ORDER BY e.notify_on ASC, e.event_date ASC;

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
