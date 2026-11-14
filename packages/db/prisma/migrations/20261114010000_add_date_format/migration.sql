-- Add date order preference on user settings (independent of UI language).
ALTER TABLE "user_settings"
ADD COLUMN "date_format" TEXT NOT NULL DEFAULT 'locale';
