-- Use Supabase built-in service role key instead of a custom vault handshake secret
-- for authenticating Postgres → API HTTP calls (reminder dispatch).
--
-- Before: reads `private_bondery_supabase_http_key` from vault, sends as x-reminder-job-secret header
-- After:  reads service role key via current_setting('supabase.service_key'), sends as Authorization: Bearer header

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
      e.type,
      e.date,
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
          'type', type,
          'date', date,
          'notifyOn', notify_on,
          'notifyDaysBefore', notify_days_before,
          'note', note
        )
        ORDER BY date, person_id
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

  SELECT decrypted_secret INTO api_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'next_public_api_url'
  LIMIT 1;

  IF api_base_url IS NULL OR api_base_url = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'scheduledUsers', user_count,
      'message', 'Missing vault secret: next_public_api_url. Add it via vault.create_secret().'
    );
  END IF;

  -- Use the built-in Supabase service role key (hosted), falling back to
  -- the vault secret 'service_role_key' for local development.
  api_secret := current_setting('supabase.service_key', true);
  IF api_secret IS NULL OR api_secret = '' THEN
    SELECT decrypted_secret INTO api_secret
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  END IF;

  IF api_secret IS NULL OR api_secret = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'scheduledUsers', user_count,
      'message', 'No service role key available. On hosted Supabase this is automatic. Locally, seed the service_role_key vault secret.'
    );
  END IF;

  api_url := rtrim(api_base_url, '/') || '/api/reminders/daily-digest';

  SELECT net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || api_secret
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

-- Clean up the now-unused vault secret (if it exists)
DELETE FROM vault.secrets WHERE name = 'private_bondery_supabase_http_key';

-- Seed a placeholder for the local Supabase service role key.
-- On hosted Supabase, current_setting('supabase.service_key') is used instead
-- and this vault secret is never read.
--
-- After `supabase db reset`, run the Setup/set_vault_service_role_key_local.sql
-- snippet in the SQL Editor and paste the `service_role key` from `npx supabase status`.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    PERFORM vault.create_secret(
      'REPLACE_WITH_SERVICE_ROLE_KEY_FROM_SUPABASE_STATUS',
      'service_role_key',
      '❗❗❗ Supabase service role JWT for local dev. Run Setup/set_vault_service_role_key_local.sql to set the real value.'
    );
  END IF;
END;
$$;

-- Seed the API URL vault secret with the local default (if not already set).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'next_public_api_url') THEN
    PERFORM vault.create_secret(
      'http://host.docker.internal:3001',
      'next_public_api_url',
      'API base URL (UPDATE IN SQL EDITOR!), used for reminder HTTP dispatch (local dev default)'
    );
  END IF;
END;
$$;
