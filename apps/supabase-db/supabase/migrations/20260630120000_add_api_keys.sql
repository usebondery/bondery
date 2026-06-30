-- User-managed long-lived API keys for third-party integrations

CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_id text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  label text NOT NULL,
  permission text NOT NULL,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_key_id_key UNIQUE (key_id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT api_keys_permission_check CHECK (permission IN ('read', 'full'))
);

CREATE INDEX api_keys_user_id_idx ON public.api_keys (user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Validate hash, return key metadata, and touch last_used_at (throttled to 1/min)
CREATE OR REPLACE FUNCTION public.authenticate_api_key(
  p_key_id text,
  p_provided_hash text
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  permission text,
  label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.api_keys%ROWTYPE;
BEGIN
  SELECT *
  INTO v_row
  FROM public.api_keys k
  WHERE k.key_id = p_key_id
    AND k.key_hash = p_provided_hash;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_row.last_used_at IS NULL OR v_row.last_used_at < now() - interval '1 minute' THEN
    UPDATE public.api_keys
    SET last_used_at = now()
    WHERE api_keys.id = v_row.id;
  END IF;

  RETURN QUERY
  SELECT v_row.id, v_row.user_id, v_row.permission, v_row.label;
END;
$$;

REVOKE ALL ON FUNCTION public.authenticate_api_key(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_api_key(text, text) TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO service_role;
