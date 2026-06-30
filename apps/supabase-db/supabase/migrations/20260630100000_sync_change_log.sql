-- Batched changelog for custom mobile pull sync.

CREATE TABLE IF NOT EXISTS public.sync_change_log (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_sequence bigint NOT NULL,
  change_index int NOT NULL DEFAULT 0,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  entity_id uuid NOT NULL,
  row_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, server_sequence, change_index)
);

CREATE INDEX IF NOT EXISTS sync_change_log_user_sequence_idx
  ON public.sync_change_log (user_id, server_sequence);

ALTER TABLE public.sync_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_change_log_select_own ON public.sync_change_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_change_log TO service_role;
