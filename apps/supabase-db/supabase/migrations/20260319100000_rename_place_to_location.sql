-- Rename the PostGIS geography column from 'location' to 'geo_location'
-- to free up the 'location' name for the user-facing text field.
ALTER TABLE people RENAME COLUMN location TO geo_location;

-- Rename the user-facing text field from 'place' to 'location'.
-- 'location' is the canonical name for the field that stores a contact's
-- location as a human-readable string (e.g. "Brno, Czechia").
ALTER TABLE people RENAME COLUMN place TO location;

-- Rename the GiST index for the PostGIS column.
ALTER INDEX idx_people_location RENAME TO idx_people_geo_location;

-- Update the set_person_location function to reference the renamed column.
CREATE OR REPLACE FUNCTION public.set_person_location(
  p_person_id uuid,
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.people
  SET
    geo_location = CASE
      WHEN p_latitude IS NULL OR p_longitude IS NULL THEN NULL
      ELSE extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    END,
    updated_at = now()
  WHERE id = p_person_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_person_location(uuid, uuid, double precision, double precision) TO authenticated;

-- Update the column comment for geo_location.
COMMENT ON COLUMN people.geo_location IS 'Geographic location coordinates (longitude, latitude) for the contact';
