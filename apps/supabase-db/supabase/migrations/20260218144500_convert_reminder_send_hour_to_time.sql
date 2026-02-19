-- Convert reminder_send_hour from integer to time for already-migrated environments.

DO $$
DECLARE
  current_data_type text;
BEGIN
  SELECT data_type
  INTO current_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_settings'
    AND column_name = 'reminder_send_hour';

  IF current_data_type IS NULL THEN
    ALTER TABLE public.user_settings
      ADD COLUMN reminder_send_hour time without time zone;
  ELSIF current_data_type <> 'time without time zone' THEN
    ALTER TABLE public.user_settings
      ALTER COLUMN reminder_send_hour TYPE time without time zone
      USING make_time(
        GREATEST(0, LEAST(COALESCE(reminder_send_hour::int, 8), 23)),
        0,
        0
      );
  END IF;

  UPDATE public.user_settings
  SET reminder_send_hour = '08:00:00'::time
  WHERE reminder_send_hour IS NULL;

  ALTER TABLE public.user_settings
    ALTER COLUMN reminder_send_hour SET DEFAULT '08:00:00'::time,
    ALTER COLUMN reminder_send_hour SET NOT NULL;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_reminder_send_hour_check'
      AND conrelid = 'public.user_settings'::regclass
  ) THEN
    ALTER TABLE public.user_settings
      DROP CONSTRAINT user_settings_reminder_send_hour_check;
  END IF;

  ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_reminder_send_hour_check
    CHECK (
      reminder_send_hour >= '00:00:00'::time
      AND reminder_send_hour <= '23:59:59'::time
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.send_hourly_reminder_digests()
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
  WITH user_clock AS (
    SELECT
      us.user_id,
      u.email AS user_email,
      COALESCE(tz.name, 'UTC') AS effective_timezone,
      us.reminder_send_hour,
      timezone(COALESCE(tz.name, 'UTC'), now()) AS local_now
    FROM public.user_settings us
    INNER JOIN auth.users u
      ON u.id = us.user_id
    LEFT JOIN pg_timezone_names tz
      ON tz.name = us.timezone
    WHERE u.email IS NOT NULL
  ),
  due_events AS (
    SELECT
      e.user_id,
      uc.user_email,
      uc.effective_timezone,
      uc.local_now::date AS local_date,
      e.person_id,
      p.first_name,
      p.last_name,
      p.avatar,
      e.event_type,
      e.event_date,
      e.note,
      e.notify_days_before,
      e.notify_on
    FROM public.people_important_events e
    INNER JOIN user_clock uc
      ON uc.user_id = e.user_id
    INNER JOIN public.people p
      ON p.id = e.person_id
      AND p.user_id = e.user_id
    WHERE e.notify_days_before IS NOT NULL
      AND e.notify_on = uc.local_now::date
      AND uc.local_now >= date_trunc('day', uc.local_now) + uc.reminder_send_hour
      AND uc.local_now < date_trunc('day', uc.local_now) + uc.reminder_send_hour + interval '1 hour'
      AND NOT EXISTS (
        SELECT 1
        FROM public.reminder_dispatch_log log
        WHERE log.user_id = e.user_id
          AND log.reminder_date = uc.local_now::date
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
  )
  SELECT
    jsonb_build_object(
      'targetDate', (now() AT TIME ZONE 'UTC')::date::text,
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
    COUNT(*)::integer
  INTO payload, user_count
  FROM grouped_by_user;

  IF user_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'scheduledUsers', 0,
      'message', 'No reminders due for current hourly window'
    );
  END IF;

  api_url := current_setting('app.settings.reminder_api_url', true);
  api_secret := current_setting('app.settings.reminder_api_secret', true);

  IF api_url IS NULL OR api_url = '' OR api_secret IS NULL OR api_secret = '' THEN
    RETURN jsonb_build_object(
      'success', false,
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

  INSERT INTO public.reminder_dispatch_log (user_id, reminder_date, timezone)
  SELECT
    (item->>'userId')::uuid,
    (item->>'targetDate')::date,
    COALESCE(item->>'timezone', 'UTC')
  FROM jsonb_array_elements(payload->'users') item
  ON CONFLICT (user_id, reminder_date) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'scheduledUsers', user_count,
    'requestId', request_id
  );
END;
$$;
