-- Add generated latitude and longitude columns from PostGIS location
-- These columns are automatically computed from the location geography column

ALTER TABLE public.people
ADD COLUMN latitude  double precision GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
ADD COLUMN longitude double precision GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

-- Add comments to describe the columns
COMMENT ON COLUMN public.people.latitude IS 'Latitude extracted from location geography column (automatically generated)';
COMMENT ON COLUMN public.people.longitude IS 'Longitude extracted from location geography column (automatically generated)';