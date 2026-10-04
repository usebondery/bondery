-- Relocate pg_trgm and unaccent into schema `extensions`.
-- Idempotent across three install states:
--   1. Prisma-era / current production: created in `public` by functions.sql
--      (CREATE EXTENSION without WITH SCHEMA).
--   2. Legacy Supabase self-hosters: already moved to `extensions` by
--      20260408100000_move_extensions_to_extensions_schema.sql.
--   3. Fresh DB: extension missing → CREATE EXTENSION … WITH SCHEMA extensions.
--
-- ALTER EXTENSION … SET SCHEMA fails when dependents exist.
-- CREATE EXTENSION IF NOT EXISTS … WITH SCHEMA extensions fails when the
-- extension already lives in `public`. Drop known dependents first, then
-- branch on pg_extension.extnamespace.
--
-- Search RPCs and immutable_unaccent are recreated by functions.sql, which
-- apply-sql-functions always runs after `prisma migrate deploy`.
-- Keep this file in sync with RELOCATE_PG_TRGM_UNACCENT_SQL in
-- packages/db/src/apply-sql-functions.ts.

CREATE SCHEMA IF NOT EXISTS extensions;

DROP INDEX IF EXISTS public.people_search_trgm_idx;
DROP INDEX IF EXISTS public.idx_people_first_name_trgm;
DROP INDEX IF EXISTS public.idx_people_last_name_trgm;
DROP INDEX IF EXISTS public.idx_people_middle_name_trgm;

DROP FUNCTION IF EXISTS public.immutable_unaccent(text);

-- Current Prisma functions.sql signatures
DROP FUNCTION IF EXISTS public.search_people_ids(uuid, text, uuid, uuid, boolean, real, integer, integer);
DROP FUNCTION IF EXISTS public.count_search_people_ids(uuid, text, uuid, uuid, boolean, real);

-- Legacy Supabase (20260404100000 / 20260408100000)
DROP FUNCTION IF EXISTS public.search_people_ids(uuid, text, integer, integer, uuid, double precision);

-- Later keep-in-touch / tag variants (20260628100000)
DROP FUNCTION IF EXISTS public.search_people_ids(uuid, text, integer, integer, uuid, uuid, double precision, boolean);
DROP FUNCTION IF EXISTS public.count_search_people_ids(uuid, text, uuid, uuid, double precision, boolean);

DO $$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF ext_schema = 'public' THEN
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  ELSIF ext_schema IS NULL THEN
    EXECUTE 'CREATE EXTENSION pg_trgm WITH SCHEMA extensions';
  END IF;
END
$$;

DO $$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'unaccent';

  IF ext_schema = 'public' THEN
    EXECUTE 'ALTER EXTENSION unaccent SET SCHEMA extensions';
  ELSIF ext_schema IS NULL THEN
    EXECUTE 'CREATE EXTENSION unaccent WITH SCHEMA extensions';
  END IF;
END
$$;
