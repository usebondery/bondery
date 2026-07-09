-- App UI language enum for user_settings.language
--
-- Values MUST match packages/schemas/locale/supported-locales.json
-- (postgresEnum: supported_locale, supported[].code).
-- After adding a locale: extend this enum, update supported-locales.json, ship translations,
-- then run `npm run gen-types` in apps/supabase-db.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supported_locale'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.supported_locale AS ENUM ('en', 'cs', 'de');
  END IF;
END
$$;

COMMENT ON TYPE public.supported_locale IS
  'Bondery app UI locales (user_settings.language). Sync with packages/schemas/locale/supported-locales.json.';

UPDATE public.user_settings
SET language = 'en'
WHERE language IS NULL
   OR lower(btrim(language)) NOT IN ('en', 'cs', 'de');

ALTER TABLE public.user_settings
  ALTER COLUMN language DROP DEFAULT;

ALTER TABLE public.user_settings
  ALTER COLUMN language TYPE public.supported_locale
  USING lower(btrim(language))::public.supported_locale;

ALTER TABLE public.user_settings
  ALTER COLUMN language SET DEFAULT 'en'::public.supported_locale,
  ALTER COLUMN language SET NOT NULL;
