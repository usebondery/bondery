-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  ✏️  CONFIG — set the service role key for local development        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════
-- Set the service_role_key vault secret for local development.
-- Run this after every `supabase db reset`.
--
-- Get the value by running in your terminal:
--   npx supabase status
-- Then copy the `service_role key` line and paste it below.
--
-- On hosted Supabase (beta/production) this secret is never read —
-- the platform injects the key automatically via supabase.service_key.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ✏️  Paste the `service_role key` from `npx supabase status` here
  service_key text := 'sb_secret_XXX';
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(
      service_key,
      'service_role_key',
      'Supabase service role JWT for local dev reminder dispatch'
    );
  ELSE
    PERFORM vault.update_secret(
      existing_id,
      service_key,
      'service_role_key',
      'Supabase service role JWT for local dev reminder dispatch'
    );
  END IF;
  RAISE NOTICE 'service_role_key updated.';
END;
$$;
