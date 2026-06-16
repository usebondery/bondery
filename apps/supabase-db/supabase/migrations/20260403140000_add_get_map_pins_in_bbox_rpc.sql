-- RPC to fetch lightweight map pin data for contacts within a lat/lon bounding box.
--
-- Returns one row per geocoded contact owned by p_user_id whose coordinates fall
-- inside the rectangle defined by (p_min_lat, p_min_lon) → (p_max_lat, p_max_lon).
-- Antimeridian crossing (e.g. bounding box that wraps the Pacific) is handled by
-- the CASE in the longitude filter: when p_min_lon > p_max_lon the box spans the
-- antimeridian and we accept points east of p_min_lon OR west of p_max_lon.
--
-- Coordinates are sourced from two places, in priority order:
--   1. people.gis_point   — set when the user picks a location via the location field.
--   2. people_addresses.gis_point — the preferred address (sort_order = 0) for contacts
--      who only have a geocoded address but no direct location set.
--
-- The function deliberately returns only display fields (no phones / emails /
-- addresses) to keep the payload small for high-zoom map loads.

CREATE OR REPLACE FUNCTION public.get_map_pins_in_bbox(
  p_user_id  uuid,
  p_min_lat  float8,
  p_max_lat  float8,
  p_min_lon  float8,
  p_max_lon  float8,
  p_limit    integer DEFAULT 500
)
RETURNS TABLE (
  id               uuid,
  first_name       text,
  last_name        text,
  headline         text,
  location         text,
  last_interaction text,
  latitude         float8,
  longitude        float8,
  updated_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH geocoded AS (
    -- 1. Contacts with a direct gis_point on the people row
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.headline,
      p.location,
      p.last_interaction::text  AS last_interaction,
      p.latitude,
      p.longitude,
      p.updated_at
    FROM public.people p
    WHERE p.user_id = p_user_id
      AND p.myself  = false
      AND p.gis_point IS NOT NULL

    UNION ALL

    -- 2. Contacts without a direct gis_point but with a geocoded address
    --    (preferred address = lowest sort_order, then earliest created_at)
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.headline,
      p.location,
      p.last_interaction::text  AS last_interaction,
      pa.latitude,
      pa.longitude,
      p.updated_at
    FROM public.people p
    JOIN public.people_addresses pa
      ON  pa.person_id = p.id
      AND pa.user_id   = p_user_id
      AND pa.gis_point IS NOT NULL
    WHERE p.user_id  = p_user_id
      AND p.myself   = false
      AND p.gis_point IS NULL
  ),
  -- Deduplicate: if a person somehow appears twice (shouldn't with current logic),
  -- keep only the first row (arbitrary but stable).
  deduped AS (
    SELECT DISTINCT ON (id)
      id, first_name, last_name, headline, location,
      last_interaction, latitude, longitude, updated_at
    FROM geocoded
    ORDER BY id, updated_at DESC
  )
  SELECT
    id, first_name, last_name, headline, location,
    last_interaction, latitude, longitude, updated_at
  FROM deduped
  WHERE latitude  >= p_min_lat
    AND latitude  <= p_max_lat
    AND (
      CASE
        WHEN p_min_lon <= p_max_lon
          THEN longitude >= p_min_lon AND longitude <= p_max_lon
        ELSE
          longitude >= p_min_lon OR longitude <= p_max_lon
      END
    )
  ORDER BY updated_at DESC
  LIMIT LEAST(p_limit, 1000);
$$;

REVOKE EXECUTE
  ON FUNCTION public.get_map_pins_in_bbox(uuid, float8, float8, float8, float8, integer)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.get_map_pins_in_bbox(uuid, float8, float8, float8, float8, integer)
  TO authenticated;
