-- Add computed reminder send date to important events and schedule daily digest dispatch

ALTER TABLE public.people_important_events
ADD COLUMN IF NOT EXISTS notify_on date NULL;

CREATE OR REPLACE FUNCTION public.compute_people_important_event_notify_on()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.notify_on :=
    CASE
      WHEN NEW.notify_days_before IS NULL THEN NULL
      ELSE NEW.event_date - NEW.notify_days_before
    END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_important_events_compute_notify_on ON public.people_important_events;
CREATE TRIGGER people_important_events_compute_notify_on
  BEFORE INSERT OR UPDATE OF event_date, notify_days_before, notify_on
  ON public.people_important_events
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_people_important_event_notify_on();

UPDATE public.people_important_events
SET notify_on =
  CASE
    WHEN notify_days_before IS NULL THEN NULL
    ELSE event_date - notify_days_before
  END;

CREATE INDEX IF NOT EXISTS people_important_events_notify_on_idx
  ON public.people_important_events(notify_on)
  WHERE notify_on IS NOT NULL;

-- Required by scheduler + outbound API call.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Dispatches all due reminder digests for a date to the API server.
-- Required settings:
--   ALTER DATABASE postgres SET app.settings.reminder_api_url = 'https://api.usebondery.com/api/reminders/daily-digest';
--   ALTER DATABASE postgres SET app.settings.reminder_api_secret = '<shared-secret>';
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
    FROM public.people_important_events e
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'dispatch-daily-reminder-digests'
  ) THEN
    PERFORM cron.schedule(
      'dispatch-daily-reminder-digests',
      '5 0 * * *',
      $cron$SELECT public.send_daily_reminder_digests(CURRENT_DATE);$cron$
    );
  END IF;
END;
$$;
