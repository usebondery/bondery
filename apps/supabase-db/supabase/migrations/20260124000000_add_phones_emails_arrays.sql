-- Migration: Add phones and emails arrays to people table
-- This migration adds jsonb arrays for phones and emails with type (home/work) and preferred flags
-- It also migrates existing phone and email values to the new structure

-- Add new columns for phones and emails arrays
ALTER TABLE people
ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN people.phones IS 'Array of phone objects: [{prefix: string, value: string, type: "home"|"work", preferred: boolean}]';
COMMENT ON COLUMN people.emails IS 'Array of email objects: [{value: string, type: "home"|"work", preferred: boolean}]';

-- Function to extract country code prefix from phone number
CREATE OR REPLACE FUNCTION extract_phone_prefix(phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Handle common prefixes
  IF phone_number ~ '^\+\d{1,4}' THEN
    -- Extract the + and 1-4 digits for country code
    RETURN SUBSTRING(phone_number FROM '^\+\d{1,4}');
  END IF;
  -- Default to +1 if no clear prefix
  RETURN '+1';
END;
$$ LANGUAGE plpgsql;

-- Function to extract phone number without prefix
CREATE OR REPLACE FUNCTION extract_phone_value(phone_number TEXT, phone_prefix TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove the prefix and any spaces/dashes
  RETURN TRIM(REGEXP_REPLACE(SUBSTRING(phone_number FROM LENGTH(phone_prefix) + 1), '[^0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Migrate existing phone values to the new phones array with prefix/value split
UPDATE people
SET phones = jsonb_build_array(
  jsonb_build_object(
    'prefix', extract_phone_prefix(phone),
    'value', extract_phone_value(phone, extract_phone_prefix(phone)),
    'type', 'home',
    'preferred', true
  )
)
WHERE phone IS NOT NULL AND phone != '' AND (phones IS NULL OR phones = '[]'::jsonb);

-- Migrate existing email values to the new emails array
UPDATE people
SET emails = jsonb_build_array(
  jsonb_build_object(
    'value', email,
    'type', 'home',
    'preferred', true
  )
)
WHERE email IS NOT NULL AND email != '' AND (emails IS NULL OR emails = '[]'::jsonb);

-- Clean up helper functions
DROP FUNCTION IF EXISTS extract_phone_prefix(TEXT);
DROP FUNCTION IF EXISTS extract_phone_value(TEXT, TEXT);

-- Keep the old phone and email columns for backwards compatibility
-- They can be removed in a future migration after all clients are updated
