-- Migrate reminder HTTP dispatch secrets from app.settings GUCs to Supabase Vault.
--
-- Background: ALTER DATABASE / ALTER ROLE for custom GUCs requires superuser or
-- database ownership, which the managed `postgres` role in Supabase hosted does not have.
-- Vault is the supported mechanism for storing secrets accessible from PL/pgSQL.
--
-- One-time setup — run in the Supabase SQL editor (or Dashboard › Vault) BEFORE deploying:
--
--   SELECT vault.create_secret(
--     'https://api.usebondery.com',
--     'next_public_api_url',
--     'API base URL used by send_hourly_reminder_digests() for HTTP dispatch'
--   );
--
--   SELECT vault.create_secret(
--     '<your-handshake-secret>',
--     'private_bondery_supabase_http_key',
--     'Shared secret for Supabase → API HTTP calls (x-reminder-job-secret header)'
--   );
--
-- To update an existing secret:
--
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'next_public_api_url'),
--     'https://new-url.com'
--   );
--
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'private_bondery_supabase_http_key'),
--     'new-secret-value'
--   );
--
-- Verify (must be postgres role or service_role):
--
--   SELECT name, description, created_at, updated_at
--   FROM vault.secrets
--   WHERE name IN ('next_public_api_url', 'private_bondery_supabase_http_key');

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

  -- Read secrets from Supabase Vault (vault.decrypted_secrets is accessible to
  -- SECURITY DEFINER functions running as the postgres role).
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
