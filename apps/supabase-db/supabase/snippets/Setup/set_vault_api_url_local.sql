-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ✏️  CONFIG — set the API URL for local development                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ❗❗❗ SUPABASE DOES NOT SYNC THE REPOSITORY SNIPPETS FROM THE REPO FOLDER
-- If you found this on the hosted supabase instance at supabase.com, the code may be outdated.
-- Please check the repository for the latest version

-- ════════════════════════════════════════════════════════════════════════
-- Set the API URL vault secret for local development.
-- Run this after `supabase db reset` or when setting up a fresh local
-- instance. Adjust api_url in the DECLARE block if your local API runs
-- on a different port.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ✏️  Change the URL here if your local API runs on a different port
  api_url     text := 'http://host.docker.internal:3001';
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'next_public_api_url' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(
      api_url,
      'next_public_api_url',
      'API base URL for reminder HTTP dispatch (local dev)'
    );
  ELSE
    PERFORM vault.update_secret(
      existing_id,
      api_url,
      'next_public_api_url',
      'API base URL for reminder HTTP dispatch (local dev)'
    );
  END IF;
  RAISE NOTICE 'next_public_api_url set to: %', api_url;
END;
$$;
