-- Improve people_addresses:
--   1. Drop the UNIQUE(person_id, type) constraint — type is now a label, not a unique key.
--      Max 5 addresses per person is enforced at application level.
--   2. Add label — free-text user-editable nickname ("Mom's place", "Holiday house").
--   3. Add location geography — GENERATED from latitude/longitude (same pattern as people.lat/lon,
--      but in reverse: here lat/lon are the input, location is the derived GIST-indexable point).
--   4. Add timezone — IANA identifier scoped to this address (not just the person).
--   5. Constrain address_geocode_source to known values.
--   6. Add geocode_confidence — persisted parse-time validity ('verified' | 'unverifiable').

-- 1. Drop the unique type constraint.
ALTER TABLE public.people_addresses
  DROP CONSTRAINT IF EXISTS people_addresses_unique_type_per_person;

-- 2. Add label column.
ALTER TABLE public.people_addresses
  ADD COLUMN IF NOT EXISTS label text;

COMMENT ON COLUMN public.people_addresses.label IS 'User-editable nickname for this address, e.g. "Mom''s place" or "Holiday house"';

-- 3. Add generated location geography from latitude/longitude.
--    Mirrors the lat/lon → location direction (opposite of people table).
ALTER TABLE public.people_addresses
  ADD COLUMN IF NOT EXISTS location extensions.geography(POINT, 4326)
    GENERATED ALWAYS AS (
      CASE
        WHEN latitude IS NULL OR longitude IS NULL THEN NULL
        ELSE extensions.ST_SetSRID(
          extensions.ST_MakePoint(longitude, latitude),
          4326
        )::extensions.geography
      END
    ) STORED;

COMMENT ON COLUMN public.people_addresses.location IS 'Geographic point derived from latitude/longitude. Auto-updated. Use for spatial queries.';

CREATE INDEX IF NOT EXISTS people_addresses_location_idx
  ON public.people_addresses USING GIST (location);

-- 4. Add per-address timezone.
ALTER TABLE public.people_addresses
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN public.people_addresses.timezone IS 'IANA timezone identifier for this address, e.g. Europe/Prague or America/New_York';

-- 5. Constrain geocode_source to known values.
--    Drop the column and re-add with a CHECK so it applies to existing rows too.
--    (ALTER COLUMN ... SET DEFAULT / ADD CONSTRAINT approach avoids rewriting the table.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'people_addresses_geocode_source_check'
      AND conrelid = 'public.people_addresses'::regclass
  ) THEN
    -- NULL-coalesce: allow NULL (not yet geocoded) but reject unknown strings.
    ALTER TABLE public.people_addresses
      ADD CONSTRAINT people_addresses_geocode_source_check
      CHECK (address_geocode_source IS NULL OR address_geocode_source IN ('mapy.com', 'manual'));
  END IF;
END $$;

-- 6. Add geocode_confidence — persists the parse-time validity result.
ALTER TABLE public.people_addresses
  ADD COLUMN IF NOT EXISTS geocode_confidence text
  CHECK (geocode_confidence IS NULL OR geocode_confidence IN ('verified', 'unverifiable'));

COMMENT ON COLUMN public.people_addresses.geocode_confidence IS 'Geocoder confidence: verified (street confirmed) or unverifiable (city-level only or no geocode result)';

-- Note on preferred address: sort_order = 0 is the preferred address for a person.
-- No separate boolean column — this is consistent with how phones/emails use sort_order.
