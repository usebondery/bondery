import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const sqlPath = fileURLToPath(new URL("../prisma/sql/functions.sql", import.meta.url));

const PUBLIC_EXTENSIONS_SQL = `
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
`;

/**
 * Idempotent relocate/create of pg_trgm + unaccent in schema `extensions`.
 * Drops search indexes/functions only when an extension still lives in `public`
 * (required before ALTER EXTENSION SET SCHEMA). Steady-state `db:functions`
 * must not rebuild GIN indexes or drop live search RPCs.
 *
 * One-shot Prisma migration:
 * prisma/migrations/20261002120000_move_pg_trgm_unaccent_to_extensions/migration.sql
 */
const RELOCATE_PG_TRGM_UNACCENT_SQL = `
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;

DO $$
DECLARE
  pg_trgm_schema text;
  unaccent_schema text;
BEGIN
  SELECT n.nspname INTO pg_trgm_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  SELECT n.nspname INTO unaccent_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'unaccent';

  IF pg_trgm_schema = 'public' OR unaccent_schema = 'public' THEN
    EXECUTE 'DROP INDEX IF EXISTS public.people_search_trgm_idx';
    EXECUTE 'DROP INDEX IF EXISTS public.idx_people_first_name_trgm';
    EXECUTE 'DROP INDEX IF EXISTS public.idx_people_last_name_trgm';
    EXECUTE 'DROP INDEX IF EXISTS public.idx_people_middle_name_trgm';
    EXECUTE 'DROP FUNCTION IF EXISTS public.immutable_unaccent(text)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.search_people_ids(uuid, text, uuid, uuid, boolean, real, integer, integer)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.count_search_people_ids(uuid, text, uuid, uuid, boolean, real)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.search_people_ids(uuid, text, integer, integer, uuid, double precision)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.search_people_ids(uuid, text, integer, integer, uuid, uuid, double precision, boolean)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.count_search_people_ids(uuid, text, uuid, uuid, double precision, boolean)';
  END IF;

  IF pg_trgm_schema = 'public' THEN
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  ELSIF pg_trgm_schema IS NULL THEN
    EXECUTE 'CREATE EXTENSION pg_trgm WITH SCHEMA extensions';
  END IF;

  IF unaccent_schema = 'public' THEN
    EXECUTE 'ALTER EXTENSION unaccent SET SCHEMA extensions';
  ELSIF unaccent_schema IS NULL THEN
    EXECUTE 'CREATE EXTENSION unaccent WITH SCHEMA extensions';
  END IF;
END
$$;
`;

export async function applySqlFunctions(databaseUrl: string): Promise<void> {
  const sql = readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // pg_trgm / unaccent must exist in `extensions` before functions.sql is
    // parsed — Postgres validates immutable_unaccent() bodies at CREATE time.
    await client.query(RELOCATE_PG_TRGM_UNACCENT_SQL);
    await client.query(PUBLIC_EXTENSIONS_SQL);
    await client.query(sql);
    console.log(`Applied ${sqlPath}`);
  } finally {
    await client.end();
  }
}
