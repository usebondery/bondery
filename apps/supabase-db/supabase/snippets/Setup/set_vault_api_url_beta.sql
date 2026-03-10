-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ✏️  CONFIG — set the API URL for the beta environment              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════
-- Set the API URL vault secret for the beta environment.
-- Run this once in the Supabase SQL editor for the beta project.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ✏️  Change the URL here if you self-host on a different domain
  api_url     text := 'https://beta.api.usebondery.com';
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'next_public_api_url' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(
      api_url,
      'next_public_api_url',
      'API base URL for reminder HTTP dispatch (beta)'
    );
  ELSE
    PERFORM vault.update_secret(
      existing_id,
      api_url,
      'next_public_api_url',
      'API base URL for reminder HTTP dispatch (beta)'
    );
  END IF;
  RAISE NOTICE 'next_public_api_url set to: %', api_url;
END;
$$;
