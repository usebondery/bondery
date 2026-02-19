-- Precompute each user's next reminder timestamp in UTC to avoid per-run timezone window scans.

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS next_reminder_at_utc timestamp with time zone;

CREATE OR REPLACE FUNCTION public.compute_next_reminder_at_utc(
  input_timezone text,
  input_send_hour time without time zone,
  base_ts timestamp with time zone DEFAULT now()
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  effective_timezone text;
  effective_send_hour time without time zone := COALESCE(input_send_hour, '08:00:00'::time);
  local_now timestamp without time zone;
  candidate_local timestamp without time zone;
  next_candidate timestamp with time zone;
BEGIN
  SELECT COALESCE(tz.name, 'UTC')
  INTO effective_timezone
  FROM (SELECT 1) seed
  LEFT JOIN LATERAL (
    SELECT name
    FROM pg_timezone_names
    WHERE name = input_timezone
    LIMIT 1
  ) tz ON true;

  local_now := timezone(effective_timezone, base_ts);
  candidate_local := date_trunc('day', local_now) + effective_send_hour;
  next_candidate := candidate_local AT TIME ZONE effective_timezone;

  IF next_candidate <= base_ts THEN
    next_candidate := (candidate_local + interval '1 day') AT TIME ZONE effective_timezone;
  END IF;

  RETURN next_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_settings_next_reminder_at_utc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.next_reminder_at_utc := public.compute_next_reminder_at_utc(
    NEW.timezone,
    NEW.reminder_send_hour,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_settings_set_next_reminder_at_utc ON public.user_settings;
CREATE TRIGGER user_settings_set_next_reminder_at_utc
  BEFORE INSERT OR UPDATE OF timezone, reminder_send_hour
  ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_settings_next_reminder_at_utc();

UPDATE public.user_settings us
SET next_reminder_at_utc = public.compute_next_reminder_at_utc(
  us.timezone,
  us.reminder_send_hour,
  now()
)
WHERE us.next_reminder_at_utc IS NULL;

ALTER TABLE public.user_settings
ALTER COLUMN next_reminder_at_utc SET NOT NULL;

CREATE INDEX IF NOT EXISTS user_settings_next_reminder_at_utc_idx
  ON public.user_settings(next_reminder_at_utc);

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
    INNER JOIN public.people_important_events e
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
    'requestId', request_id
  );
END;
$$;