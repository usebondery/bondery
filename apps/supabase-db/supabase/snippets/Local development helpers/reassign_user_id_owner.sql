-- Reassign ownership of local dev data to the only auth user in the database.
--
-- Usage:
-- 1) Ensure either:
--    - exactly one row exists in auth.users, or
--    - two rows exist where one is the seeded user (seed@usebondery.local).
-- 2) Run in SQL editor with a privileged role (service role/postgres).
--
-- Notes:
-- - Updates every table in schema `public` that contains a `user_id` column.
-- - Intentionally skips `public.user_settings` to avoid unique(user_id) collisions.
-- - Reassigns all non-target user_id values to the single auth user.

DO $$
DECLARE
  target_user_id uuid;
  candidate_user_count integer;
  table_row_count bigint;
  relation record;
BEGIN
  SELECT COUNT(*)::integer
  INTO candidate_user_count
  FROM auth.users u
  WHERE COALESCE(u.email, '') <> 'seed@usebondery.local';

  IF candidate_user_count = 0 THEN
    SELECT COUNT(*)::integer
    INTO candidate_user_count
    FROM auth.users;

    IF candidate_user_count = 0 THEN
      RAISE EXCEPTION 'No users found in auth.users. Create one user first.';
    END IF;

    IF candidate_user_count <> 1 THEN
      RAISE EXCEPTION 'Could not determine target user automatically. Found % users and no non-seed candidate.', candidate_user_count;
    END IF;

    SELECT id
    INTO target_user_id
    FROM auth.users
    ORDER BY created_at ASC, id ASC
    LIMIT 1;
  ELSIF candidate_user_count = 1 THEN
    SELECT id
    INTO target_user_id
    FROM auth.users
    WHERE COALESCE(email, '') <> 'seed@usebondery.local'
    ORDER BY created_at ASC, id ASC
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Expected exactly 1 non-seed user in auth.users, found %', candidate_user_count;
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users. Create one user first.';
  END IF;

  FOR relation IN
    SELECT
      c.table_schema,
      c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND c.table_name <> 'user_settings'
    ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET user_id = $1 WHERE user_id IS DISTINCT FROM $1',
      relation.table_schema,
      relation.table_name
    )
    USING target_user_id;

    GET DIAGNOSTICS table_row_count = ROW_COUNT;

    RAISE NOTICE 'Updated %.%: % row(s) to user %',
      relation.table_schema,
      relation.table_name,
      table_row_count,
      target_user_id;
  END LOOP;
END;
$$;
