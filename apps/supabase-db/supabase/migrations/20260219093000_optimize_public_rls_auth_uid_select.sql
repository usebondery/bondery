-- Optimize public schema RLS policy expressions by wrapping auth.uid() in SELECT.
-- This keeps behavior the same while allowing Postgres to treat auth.uid() as an initplan.

DO $$
DECLARE
  policy_record record;
  optimized_qual text;
  optimized_with_check text;
BEGIN
  FOR policy_record IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        COALESCE(p.qual, '') LIKE '%auth.uid()%' OR COALESCE(p.with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    optimized_qual := CASE
      WHEN policy_record.qual IS NULL THEN NULL
      ELSE regexp_replace(policy_record.qual, '\bauth\.uid\(\)', '(select auth.uid())', 'g')
    END;

    optimized_with_check := CASE
      WHEN policy_record.with_check IS NULL THEN NULL
      ELSE regexp_replace(
        policy_record.with_check,
        '\bauth\.uid\(\)',
        '(select auth.uid())',
        'g'
      )
    END;

    IF optimized_qual IS DISTINCT FROM policy_record.qual
       OR optimized_with_check IS DISTINCT FROM policy_record.with_check THEN
      IF optimized_qual IS NOT NULL AND optimized_with_check IS NOT NULL THEN
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s);',
          policy_record.policyname,
          policy_record.schemaname,
          policy_record.tablename,
          optimized_qual,
          optimized_with_check
        );
      ELSIF optimized_qual IS NOT NULL THEN
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I USING (%s);',
          policy_record.policyname,
          policy_record.schemaname,
          policy_record.tablename,
          optimized_qual
        );
      ELSIF optimized_with_check IS NOT NULL THEN
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I WITH CHECK (%s);',
          policy_record.policyname,
          policy_record.schemaname,
          policy_record.tablename,
          optimized_with_check
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
