-- ============================================================================
-- Add color scheme preference to user_settings
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'color_scheme'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.color_scheme AS ENUM ('light', 'dark', 'auto');
  END IF;
END
$$;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS color_scheme public.color_scheme;

UPDATE public.user_settings
SET color_scheme = 'auto'
WHERE color_scheme IS NULL;

ALTER TABLE public.user_settings
  ALTER COLUMN color_scheme SET DEFAULT 'auto',
  ALTER COLUMN color_scheme SET NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, language, timezone, color_scheme)
  VALUES (NEW.id, 'en', 'UTC', 'auto');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
