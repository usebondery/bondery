-- RPC to fetch address pin data for contacts within a lat/lon bounding box.
--
-- Unlike get_map_pins_in_bbox (which returns one pin per person), this function
-- returns one row per people_addresses record — so the same person can appear
-- multiple times on the map (home, work, other addresses).
--
-- Antimeridian crossing is handled identically to get_map_pins_in_bbox.

-- Spatial index on people_addresses.gis_point to support fast bbox queries.
-- Without this, the RPC performs a full table scan on every viewport move.
CREATE INDEX IF NOT EXISTS people_addresses_gis_idx
  ON public.people_addresses USING GIST (gis_point)
  WHERE gis_point IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_map_address_pins_in_bbox(
  p_user_id  uuid,
  p_min_lat  float8,
  p_max_lat  float8,
  p_min_lon  float8,
  p_max_lon  float8,
  p_limit    integer DEFAULT 500
)
RETURNS TABLE (
  address_id        uuid,
  person_id         uuid,
  first_name        text,
  last_name         text,
  address_type      text,
  address_formatted text,
  address_city      text,
  address_country   text,
  latitude          float8,
  longitude         float8,
  updated_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.id                 AS address_id,
    p.id                  AS person_id,
    p.first_name,
    p.last_name,
    pa.type               AS address_type,
    pa.address_formatted,
    pa.address_city,
    pa.address_country,
    pa.latitude,
    pa.longitude,
    pa.updated_at
  FROM public.people_addresses pa
  JOIN public.people p
    ON  p.id      = pa.person_id
    AND p.user_id = p_user_id
    AND p.myself  = false
  WHERE pa.user_id    = p_user_id
    AND pa.gis_point  IS NOT NULL
    AND pa.latitude   >= p_min_lat
    AND pa.latitude   <= p_max_lat
    AND (
      CASE
        WHEN p_min_lon <= p_max_lon
          THEN pa.longitude >= p_min_lon AND pa.longitude <= p_max_lon
        ELSE
          pa.longitude >= p_min_lon OR pa.longitude <= p_max_lon
      END
    )
  ORDER BY p.id, pa.sort_order, pa.created_at
  LIMIT LEAST(p_limit, 1000);
$$;

REVOKE EXECUTE
  ON FUNCTION public.get_map_address_pins_in_bbox(uuid, float8, float8, float8, float8, integer)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.get_map_address_pins_in_bbox(uuid, float8, float8, float8, float8, integer)
  TO authenticated;
