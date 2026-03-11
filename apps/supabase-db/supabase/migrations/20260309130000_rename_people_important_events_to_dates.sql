-- Rename people_important_events → people_important_dates.
-- Column names (event_type, event_date, notify_days_before, notify_on, etc.)
-- are intentionally preserved — only the table and object names change.

-- ─── 1. Rename table ─────────────────────────────────────────────────────────
ALTER TABLE public.people_important_events
  RENAME TO people_important_dates;

-- ─── 2. Rename constraints ────────────────────────────────────────────────────
ALTER TABLE public.people_important_dates
  RENAME CONSTRAINT people_important_events_pkey
  TO people_important_dates_pkey;

ALTER TABLE public.people_important_dates
  RENAME CONSTRAINT people_important_events_user_id_fkey
  TO people_important_dates_user_id_fkey;

ALTER TABLE public.people_important_dates
  RENAME CONSTRAINT people_important_events_person_id_fkey
  TO people_important_dates_person_id_fkey;

ALTER TABLE public.people_important_dates
  RENAME CONSTRAINT people_important_events_type_check
  TO people_important_dates_type_check;

ALTER TABLE public.people_important_dates
  RENAME CONSTRAINT people_important_events_notify_days_before_check
  TO people_important_dates_notify_days_before_check;

-- ─── 3. Rename indexes ────────────────────────────────────────────────────────
ALTER INDEX IF EXISTS public.people_important_events_unique_birthday_idx
  RENAME TO people_important_dates_unique_birthday_idx;

ALTER INDEX IF EXISTS public.people_important_events_unique_event_idx
  RENAME TO people_important_dates_unique_event_idx;

ALTER INDEX IF EXISTS public.people_important_events_user_id_idx
  RENAME TO people_important_dates_user_id_idx;

ALTER INDEX IF EXISTS public.people_important_events_person_id_idx
  RENAME TO people_important_dates_person_id_idx;

ALTER INDEX IF EXISTS public.people_important_events_event_date_idx
  RENAME TO people_important_dates_event_date_idx;

ALTER INDEX IF EXISTS public.people_important_events_notify_on_idx
  RENAME TO people_important_dates_notify_on_idx;

-- ─── 4. Rename triggers ───────────────────────────────────────────────────────
ALTER TRIGGER people_important_events_updated_at
  ON public.people_important_dates
  RENAME TO people_important_dates_updated_at;

ALTER TRIGGER people_important_events_compute_notify_on
  ON public.people_important_dates
  RENAME TO people_important_dates_compute_notify_on;

-- ─── 5. Rename RLS policies ───────────────────────────────────────────────────
ALTER POLICY "Users can view their own people important events"
  ON public.people_important_dates
  RENAME TO "Users can view their own people important dates";

ALTER POLICY "Users can insert their own people important events"
  ON public.people_important_dates
  RENAME TO "Users can insert their own people important dates";

ALTER POLICY "Users can update their own people important events"
  ON public.people_important_dates
  RENAME TO "Users can update their own people important dates";

ALTER POLICY "Users can delete their own people important events"
  ON public.people_important_dates
  RENAME TO "Users can delete their own people important dates";

-- ─── 6. Update functions that reference the old table name ───────────────────
-- send_daily_reminder_digests (superseded by hourly, but still present in DB)
CREATE OR REPLACE FUNCTION public.send_daily_reminder_digests(target_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  payload jsonb;
  api_url text;
  api_secret text;
  request_id bigint;
  user_count integer;
BEGIN
  WITH due_events AS (
    SELECT
      e.user_id,
      u.email AS user_email,
      e.person_id,
      p.first_name,
      p.last_name,
      p.avatar,
      e.event_type,
      e.event_date,
      e.note,
      e.notify_days_before,
      e.notify_on
    FROM public.people_important_dates e
    INNER JOIN public.people p
      ON p.id = e.person_id
      AND p.user_id = e.user_id
    INNER JOIN auth.users u
      ON u.id = e.user_id
    WHERE e.notify_on = target_date
      AND e.notify_days_before IS NOT NULL
      AND u.email IS NOT NULL
  ),
  grouped_by_user AS (
    SELECT
      user_id,
      user_email,
      jsonb_agg(
        jsonb_build_object(
          'personId', person_id,
          'personName', trim(concat_ws(' ', first_name, last_name)),
          'personAvatar', avatar,
          'eventType', event_type,
          'eventDate', event_date,
          'notifyOn', notify_on,
          'notifyDaysBefore', notify_days_before,
          'note', note
        )
        ORDER BY event_date, person_id
      ) AS reminders
    FROM due_events
    GROUP BY user_id, user_email
  )
  SELECT
    jsonb_build_object(
      'targetDate', target_date::text,
      'users', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'userId', user_id,
            'email', user_email,
            'reminders', reminders
          )
          ORDER BY user_id
        ),
        '[]'::jsonb
      )
    ),
    COUNT(*)::integer
  INTO payload, user_count
  FROM grouped_by_user;

  IF user_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'targetDate', target_date::text,
      'scheduledUsers', 0,
      'message', 'No reminders due for target date'
    );
  END IF;

  api_url := current_setting('app.settings.reminder_api_url', true);
  api_secret := current_setting('app.settings.reminder_api_secret', true);

  IF api_url IS NULL OR api_url = '' OR api_secret IS NULL OR api_secret = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'targetDate', target_date::text,
      'scheduledUsers', user_count,
      'message', 'Missing app.settings.reminder_api_url or app.settings.reminder_api_secret'
    );
  END IF;

  SELECT net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-job-secret', api_secret
    ),
    body := payload
  ) INTO request_id;

  RETURN jsonb_build_object(
    'success', true,
    'targetDate', target_date::text,
    'scheduledUsers', user_count,
    'requestId', request_id
  );
END;
$$;

-- send_hourly_reminder_digests (active function used by the hourly cron job)
-- Body sourced from 20260224120000_use_vault_for_reminder_http_settings.sql
-- with people_important_events replaced by people_important_dates.
CREATE OR REPLACE FUNCTION public.send_hourly_reminder_digests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  payload jsonb;
  api_base_url text;
  api_url text;
  api_secret text;
  request_id bigint;
  user_count integer;
  due_user_count integer;
  run_started_at timestamp with time zone := now();
BEGIN
  WITH due_users AS (
    SELECT
      us.user_id,
      u.email AS user_email,
      COALESCE(tz.name, 'UTC') AS effective_timezone,
      timezone(COALESCE(tz.name, 'UTC'), run_started_at)::date AS local_date
    FROM public.user_settings us
    INNER JOIN auth.users u
      ON u.id = us.user_id
    LEFT JOIN pg_timezone_names tz
      ON tz.name = us.timezone
    WHERE u.email IS NOT NULL
      AND us.next_reminder_at_utc <= run_started_at
  ),
  due_events AS (
    SELECT
      e.user_id,
      du.user_email,
      du.effective_timezone,
      du.local_date,
      e.person_id,
      p.first_name,
      p.last_name,
      p.avatar,
      e.event_type,
      e.event_date,
      e.note,
      e.notify_days_before,
      e.notify_on
    FROM due_users du
    INNER JOIN public.people_important_dates e
      ON e.user_id = du.user_id
    INNER JOIN public.people p
      ON p.id = e.person_id
      AND p.user_id = e.user_id
    WHERE e.notify_days_before IS NOT NULL
      AND e.notify_on = du.local_date
      AND NOT EXISTS (
        SELECT 1
        FROM public.reminder_dispatch_log log
        WHERE log.user_id = e.user_id
          AND log.reminder_date = du.local_date
      )
  ),
  grouped_by_user AS (
    SELECT
      user_id,
      user_email,
      effective_timezone,
      local_date,
      jsonb_agg(
        jsonb_build_object(
          'personId', person_id,
          'personName', trim(concat_ws(' ', first_name, last_name)),
          'personAvatar', avatar,
          'eventType', event_type,
          'eventDate', event_date,
          'notifyOn', notify_on,
          'notifyDaysBefore', notify_days_before,
          'note', note
        )
        ORDER BY event_date, person_id
      ) AS reminders
    FROM due_events
    GROUP BY user_id, user_email, effective_timezone, local_date
  ),
  due_user_counts AS (
    SELECT COUNT(*)::integer AS total_due_users
    FROM due_users
  )
  SELECT
    jsonb_build_object(
      'targetDate', (run_started_at AT TIME ZONE 'UTC')::date::text,
      'users', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'userId', user_id,
            'email', user_email,
            'timezone', effective_timezone,
            'targetDate', local_date::text,
            'reminders', reminders
          )
          ORDER BY user_id
        ),
        '[]'::jsonb
      )
    ),
    COUNT(*)::integer,
    COALESCE(MAX(duc.total_due_users), 0)
  INTO payload, user_count, due_user_count
  FROM grouped_by_user gbu
  FULL JOIN due_user_counts duc ON true;

  IF due_user_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'scheduledUsers', 0,
      'message', 'No users due for current hourly window'
    );
  END IF;

  IF user_count = 0 THEN
    UPDATE public.user_settings us
    SET next_reminder_at_utc = public.compute_next_reminder_at_utc(
      us.timezone,
      us.reminder_send_hour,
      run_started_at
    )
    WHERE us.next_reminder_at_utc <= run_started_at;

    RETURN jsonb_build_object(
      'success', true,
      'scheduledUsers', 0,
      'message', 'No reminders due for current hourly window'
    );
  END IF;

  -- Read secrets from Supabase Vault
  SELECT decrypted_secret INTO api_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'next_public_api_url'
  LIMIT 1;

  SELECT decrypted_secret INTO api_secret
  FROM vault.decrypted_secrets
  WHERE name = 'private_bondery_supabase_http_key'
  LIMIT 1;

  IF api_base_url IS NULL OR api_base_url = '' OR api_secret IS NULL OR api_secret = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'scheduledUsers', user_count,
      'message', 'Missing vault secrets: next_public_api_url or private_bondery_supabase_http_key. Add them via vault.create_secret().'
    );
  END IF;

  api_url := rtrim(api_base_url, '/') || '/api/reminders/daily-digest';

  SELECT net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-job-secret', api_secret
    ),
    body := payload
  ) INTO request_id;

  INSERT INTO public.reminder_dispatch_log (user_id, reminder_date, timezone)
  SELECT
    (item->>'userId')::uuid,
    (item->>'targetDate')::date,
    COALESCE(item->>'timezone', 'UTC')
  FROM jsonb_array_elements(payload->'users') item
  ON CONFLICT (user_id, reminder_date) DO NOTHING;

  UPDATE public.user_settings us
  SET next_reminder_at_utc = public.compute_next_reminder_at_utc(
    us.timezone,
    us.reminder_send_hour,
    run_started_at
  )
  WHERE us.next_reminder_at_utc <= run_started_at;

  RETURN jsonb_build_object(
    'success', true,
    'scheduledUsers', user_count,
    'requestId', request_id,
    'targetUrl', api_url
  );
END;
$$;
