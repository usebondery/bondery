-- Restrict public schema RLS policies to authenticated users.
-- Intentionally does not modify storage.objects policies so avatar URLs remain publicly accessible.

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname
    FROM pg_policies p
    WHERE p.schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO authenticated;',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END;
$$;
