-- PowerSync replication setup for local (or self-hosted) Postgres.
-- Run once after creating the database. Set a strong password before connecting PowerSync.
--
-- See: apps/supabase-db/docs/powersync-local-development.md

-- Role used by PowerSync to read the replication stream.
-- Replace the empty password with a secret before use.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powersync_role') THEN
    CREATE ROLE powersync_role WITH REPLICATION LOGIN PASSWORD 'changeme';
  ELSE
    ALTER ROLE powersync_role WITH PASSWORD 'changeme';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO powersync_role;
GRANT USAGE ON SCHEMA public TO powersync_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Publication name must be "powersync" for PowerSync.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync FOR ALL TABLES;
  END IF;
END
$$;
