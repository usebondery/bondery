-- Add international address fields to people table
-- Supports full addresses and coarse locations (city/state/country)

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_state_code text,
  ADD COLUMN IF NOT EXISTS address_country text,
  ADD COLUMN IF NOT EXISTS address_country_code char(2),
  ADD COLUMN IF NOT EXISTS address_granularity text NOT NULL DEFAULT 'address',
  ADD COLUMN IF NOT EXISTS address_formatted text,
  ADD COLUMN IF NOT EXISTS address_geocode_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'people_address_granularity_check'
      AND conrelid = 'public.people'::regclass
  ) THEN
    ALTER TABLE public.people
      ADD CONSTRAINT people_address_granularity_check
      CHECK (address_granularity IN ('address', 'city', 'state', 'country'));
  END IF;
END $$;

COMMENT ON COLUMN public.people.address_line1 IS 'Street address and house number';
COMMENT ON COLUMN public.people.address_line2 IS 'Apartment, suite, floor, building, or secondary line';
COMMENT ON COLUMN public.people.address_city IS 'City, municipality, or locality';
COMMENT ON COLUMN public.people.address_postal_code IS 'Postal code / ZIP code (country-specific format)';
COMMENT ON COLUMN public.people.address_state IS 'Top-level administrative subdivision (state/region/prefecture/province)';
COMMENT ON COLUMN public.people.address_state_code IS 'Subdivision code (prefer ISO 3166-2 when available)';
COMMENT ON COLUMN public.people.address_country IS 'Country display name';
COMMENT ON COLUMN public.people.address_country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN public.people.address_granularity IS 'Address precision level: address, city, state, or country';
COMMENT ON COLUMN public.people.address_formatted IS 'Canonical formatted address string for display';
COMMENT ON COLUMN public.people.address_geocode_source IS 'Address source, for example mapy.com or manual';

CREATE INDEX IF NOT EXISTS people_user_country_code_idx
  ON public.people (user_id, address_country_code);

CREATE INDEX IF NOT EXISTS people_user_granularity_idx
  ON public.people (user_id, address_granularity);

-- Sets people.location from latitude + longitude.
-- This keeps generated latitude/longitude columns in sync.
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
    location = CASE
      WHEN p_latitude IS NULL OR p_longitude IS NULL THEN NULL
      ELSE extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    END,
    updated_at = now()
  WHERE id = p_person_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_person_location(uuid, uuid, double precision, double precision) TO authenticated;
