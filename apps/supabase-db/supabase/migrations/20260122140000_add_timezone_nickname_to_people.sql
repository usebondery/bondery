-- Add timezone and nickname columns to people table for enhanced vCard export
ALTER TABLE people
ADD COLUMN timezone TEXT,
ADD COLUMN nickname TEXT;

-- Add comments to describe the columns
COMMENT ON COLUMN people.timezone IS 'Timezone identifier (e.g., America/New_York, Europe/Prague)';
COMMENT ON COLUMN people.nickname IS 'Informal or preferred name for the contact';
