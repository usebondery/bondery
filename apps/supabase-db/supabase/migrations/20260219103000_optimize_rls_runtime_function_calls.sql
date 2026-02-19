-- Optimize RLS policy expressions by avoiding per-row re-evaluation of auth/current_setting calls.
-- This migration updates existing public schema policies in-place.

DO $$
DECLARE
  policy_record record;
  original_qual text;
  original_with_check text;
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
        COALESCE(p.qual, '') LIKE '%auth.uid()%' OR
        COALESCE(p.with_check, '') LIKE '%auth.uid()%' OR
        COALESCE(p.qual, '') LIKE '%current_setting(%' OR
        COALESCE(p.with_check, '') LIKE '%current_setting(%'
      )
  LOOP
    original_qual := policy_record.qual;
    original_with_check := policy_record.with_check;
    optimized_qual := original_qual;
    optimized_with_check := original_with_check;

    IF optimized_qual IS NOT NULL THEN
      optimized_qual := replace(optimized_qual, '(select auth.uid())', '__AUTH_UID_WRAPPED__');
      optimized_qual := regexp_replace(
        optimized_qual,
        '\bauth\.uid\(\)',
        '(select auth.uid())',
        'g'
      );
      optimized_qual := replace(optimized_qual, '__AUTH_UID_WRAPPED__', '(select auth.uid())');

      optimized_qual := replace(
        optimized_qual,
        '(select current_setting(',
        '__CURRENT_SETTING_WRAPPED__('
      );
      optimized_qual := regexp_replace(
        optimized_qual,
        '\bcurrent_setting\(',
        '(select current_setting(',
        'g'
      );
      optimized_qual := replace(
        optimized_qual,
        '__CURRENT_SETTING_WRAPPED__(',
        '(select current_setting('
      );
    END IF;

    IF optimized_with_check IS NOT NULL THEN
      optimized_with_check := replace(
        optimized_with_check,
        '(select auth.uid())',
        '__AUTH_UID_WRAPPED__'
      );
      optimized_with_check := regexp_replace(
        optimized_with_check,
        '\bauth\.uid\(\)',
        '(select auth.uid())',
        'g'
      );
      optimized_with_check := replace(
        optimized_with_check,
        '__AUTH_UID_WRAPPED__',
        '(select auth.uid())'
      );

      optimized_with_check := replace(
        optimized_with_check,
        '(select current_setting(',
        '__CURRENT_SETTING_WRAPPED__('
      );
      optimized_with_check := regexp_replace(
        optimized_with_check,
        '\bcurrent_setting\(',
        '(select current_setting(',
        'g'
      );
      optimized_with_check := replace(
        optimized_with_check,
        '__CURRENT_SETTING_WRAPPED__(',
        '(select current_setting('
      );
    END IF;

    IF optimized_qual IS DISTINCT FROM original_qual
       OR optimized_with_check IS DISTINCT FROM original_with_check THEN
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
