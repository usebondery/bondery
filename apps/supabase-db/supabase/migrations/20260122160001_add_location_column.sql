-- Add location column to people table using PostGIS geography type
-- This stores geographic coordinates (longitude, latitude) for vCard GEO export
ALTER TABLE people
ADD COLUMN location extensions.geography(POINT, 4326);

-- Add comment to describe the column
COMMENT ON COLUMN people.location IS 'Geographic location coordinates (longitude, latitude) for the contact';

-- Create an index for geographic queries (optional but recommended for performance)
CREATE INDEX idx_people_location ON people USING GIST (location);
