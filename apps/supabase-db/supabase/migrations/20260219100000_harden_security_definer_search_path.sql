-- Harden user-defined functions by fixing mutable search_path.
-- Applies to non-system, non-extension-owned functions that do not already set search_path.

DO $$
DECLARE
  function_record record;
  target_search_path text;
BEGIN
  FOR function_record IN
    SELECT
      p.oid::regprocedure AS function_signature,
      n.nspname AS schema_name,
      p.proname AS function_name
    FROM pg_proc p
    INNER JOIN pg_namespace n
      ON n.oid = p.pronamespace
    LEFT JOIN pg_depend dep
      ON dep.classid = 'pg_proc'::regclass
      AND dep.objid = p.oid
      AND dep.deptype = 'e'
    WHERE dep.objid IS NULL
      AND p.proowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
      AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    target_search_path := format('pg_catalog, %I', function_record.schema_name);

    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = %s;',
      function_record.function_signature,
      target_search_path
    );
  END LOOP;
END;
$$;
