-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ✏️  CONFIG — set the API URL for production                        ║
-- ║                                                                      ║
-- ║  SELF-HOSTING: replace the URL with your own API endpoint.          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════
-- Override the API URL vault secret for production.
-- The default URL above points to the Bondery hosted production API.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ✏️  Replace with your own API URL if self-hosting
  api_url     text := 'https://api.usebondery.com';
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'next_public_api_url' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(
      api_url,
      'next_public_api_url',
      'API base URL for reminder HTTP dispatch (production)'
    );
  ELSE
    PERFORM vault.update_secret(
      existing_id,
      api_url,
      'next_public_api_url',
      'API base URL for reminder HTTP dispatch (production)'
    );
  END IF;
  RAISE NOTICE 'next_public_api_url set to: %', api_url;
END;
$$;
