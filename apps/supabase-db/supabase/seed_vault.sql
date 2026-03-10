-- Vault secrets for local development.
-- This file is picked up automatically by `npx supabase db reset`.
-- Secrets are upserted so running reset multiple times is safe.
--
-- Values are read from environment variables via psql \getenv:
--   NEXT_PUBLIC_API_URL              -> next_public_api_url vault secret
--   PRIVATE_BONDERY_SUPABASE_HTTP_KEY -> private_bondery_supabase_http_key vault secret
--
-- Set these in apps/supabase-db/.env.local for local development.
-- For production/staging, set them manually via the Supabase dashboard or SQL editor.
-- See supabase/functions/.env.local.example for instructions.

\getenv next_public_api_url NEXT_PUBLIC_API_URL
\getenv private_bondery_supabase_http_key PRIVATE_BONDERY_SUPABASE_HTTP_KEY

DO $$
DECLARE
  secret_name text;
  secret_value text;
  existing_id uuid;
BEGIN
  -- next_public_api_url: API base URL reachable from Supabase Docker containers
  secret_name := 'next_public_api_url';
  secret_value := :'next_public_api_url';
  IF secret_value IS NOT NULL AND secret_value <> '' THEN
    SELECT id INTO existing_id FROM vault.secrets WHERE name = secret_name LIMIT 1;
    IF existing_id IS NULL THEN
      PERFORM vault.create_secret(secret_value, secret_name, 'API base URL for reminder HTTP dispatch');
    ELSE
      PERFORM vault.update_secret(existing_id, secret_value, secret_name, 'API base URL for reminder HTTP dispatch');
    END IF;
  END IF;

  -- private_bondery_supabase_http_key: shared handshake secret for Supabase -> API HTTP calls
  secret_name := 'private_bondery_supabase_http_key';
  secret_value := :'private_bondery_supabase_http_key';
  IF secret_value IS NOT NULL AND secret_value <> '' THEN
    SELECT id INTO existing_id FROM vault.secrets WHERE name = secret_name LIMIT 1;
    IF existing_id IS NULL THEN
      PERFORM vault.create_secret(secret_value, secret_name, 'Shared secret for Supabase -> API HTTP calls');
    ELSE
      PERFORM vault.update_secret(existing_id, secret_value, secret_name, 'Shared secret for Supabase -> API HTTP calls');
    END IF;
  END IF;
END;
$$;
