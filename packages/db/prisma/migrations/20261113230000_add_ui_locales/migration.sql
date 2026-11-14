-- Rebuild supported_locale so the new values can apply inside a transaction.
-- PostgreSQL refuses ALTER TYPE ... ADD VALUE inside a transaction block.
ALTER TYPE "supported_locale" RENAME TO "supported_locale_old";

CREATE TYPE "supported_locale" AS ENUM (
  'en',
  'bg',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'et',
  'fi',
  'fr',
  'hr',
  'hu',
  'it',
  'lt',
  'lv',
  'nb',
  'nl',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'sr',
  'sv',
  'tr',
  'uk'
);

ALTER TABLE "user_settings"
  ALTER COLUMN "language" DROP DEFAULT,
  ALTER COLUMN "language" TYPE "supported_locale" USING ("language"::text::"supported_locale"),
  ALTER COLUMN "language" SET DEFAULT 'en';

DROP TYPE "supported_locale_old";
