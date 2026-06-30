# Reference snippet — applied automatically via migration 20260628130000_electric_sync.sql.
# Use this only for manual repair or new environments without migrations.

-- See docs/contributing/local-setup.md#electric-mobile-sync

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'electric_role') THEN
    CREATE ROLE electric_role WITH REPLICATION LOGIN PASSWORD 'changeme';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO electric_role;
GRANT USAGE ON SCHEMA public TO electric_role;

-- Replace password before connecting Electric in production.
