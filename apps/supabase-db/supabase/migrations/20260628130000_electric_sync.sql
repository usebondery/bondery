-- Electric logical replication + mobile sync mutation tracking.
-- See docs/contributing/local-setup.md#electric-mobile-sync

-- Role used by Electric to read the replication stream.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'electric_role') THEN
    CREATE ROLE electric_role WITH REPLICATION LOGIN PASSWORD 'changeme';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO electric_role;
GRANT USAGE ON SCHEMA public TO electric_role;

-- Curated publication for mobile sync (NOT all tables).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    DROP PUBLICATION powersync;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication') THEN
    DROP PUBLICATION electric_publication;
  END IF;
END
$$;

CREATE PUBLICATION electric_publication FOR TABLE
  public.people,
  public.people_phones,
  public.people_emails,
  public.people_addresses,
  public.people_socials,
  public.groups,
  public.people_groups,
  public.tags,
  public.people_tags,
  public.people_important_dates;

GRANT SELECT ON
  public.people,
  public.people_phones,
  public.people_emails,
  public.people_addresses,
  public.people_socials,
  public.groups,
  public.people_groups,
  public.tags,
  public.people_tags,
  public.people_important_dates
TO electric_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO electric_role;

-- Per-user monotonic sequence for sync push ordering.
CREATE TABLE IF NOT EXISTS public.sync_user_sequence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sequence bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.sync_user_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_user_sequence_select_own ON public.sync_user_sequence
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Idempotency receipts for POST /api/sync/push.
CREATE TABLE IF NOT EXISTS public.sync_mutation_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_mutation_id uuid NOT NULL,
  mutation_type text NOT NULL,
  payload_hash text NOT NULL,
  server_sequence bigint NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS sync_mutation_receipts_user_sequence_idx
  ON public.sync_mutation_receipts (user_id, server_sequence DESC);

ALTER TABLE public.sync_mutation_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_mutation_receipts_select_own ON public.sync_mutation_receipts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allocate next server sequence for a user (called from API via service role).
CREATE OR REPLACE FUNCTION public.allocate_sync_server_sequence(p_user_id uuid, p_count int DEFAULT 1)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new bigint;
  v_start bigint;
BEGIN
  INSERT INTO sync_user_sequence (user_id, last_sequence)
  VALUES (p_user_id, p_count)
  ON CONFLICT (user_id) DO UPDATE
    SET last_sequence = sync_user_sequence.last_sequence + EXCLUDED.last_sequence
  RETURNING last_sequence INTO v_new;

  v_start := v_new - p_count + 1;
  RETURN v_start;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_sync_server_sequence(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_sync_server_sequence(uuid, int) TO service_role;

-- Returns current transaction id as text (call after writes in same request).
CREATE OR REPLACE FUNCTION public.get_current_sync_txid()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_current_xact_id()::text;
$$;

REVOKE ALL ON FUNCTION public.get_current_sync_txid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_sync_txid() TO authenticated, service_role;
