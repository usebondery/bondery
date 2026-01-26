-- Add gender and language columns to people table for vCard export
ALTER TABLE people
ADD COLUMN gender TEXT,
ADD COLUMN language TEXT DEFAULT 'en';

-- Add comment to describe the columns
COMMENT ON COLUMN people.gender IS 'Gender of the contact (e.g., M, F, O, N, U)';
COMMENT ON COLUMN people.language IS 'Preferred language code (ISO 639-1, e.g., en, cs)';
