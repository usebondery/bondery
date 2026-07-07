-- Return last_interaction as timestamptz from get_map_pins_in_bbox so PostgREST
-- serializes it as ISO 8601 (RFC 3339), consistent with other API timestamps.
-- The prior ::text cast produced Postgres text format (space separator), which
-- failed Fastify response validation against nullableDateTimeSchema.

DROP FUNCTION IF EXISTS public.get_map_pins_in_bbox(uuid, float8, float8, float8, float8, integer);

CREATE FUNCTION public.get_map_pins_in_bbox(
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
  last_interaction timestamptz,
  latitude         float8,
  longitude        float8,
  updated_at       timestamptz,
  has_avatar       boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH geocoded AS (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.headline,
      p.location,
      p.last_interaction,
      p.latitude,
      p.longitude,
      p.updated_at,
      p.has_avatar
    FROM public.people p
    WHERE p.user_id = p_user_id
      AND p.myself  = false
      AND p.gis_point IS NOT NULL

    UNION ALL

    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.headline,
      p.location,
      p.last_interaction,
      pa.latitude,
      pa.longitude,
      p.updated_at,
      p.has_avatar
    FROM public.people p
    JOIN public.people_addresses pa
      ON  pa.person_id = p.id
      AND pa.user_id   = p_user_id
      AND pa.gis_point IS NOT NULL
    WHERE p.user_id  = p_user_id
      AND p.myself   = false
      AND p.gis_point IS NULL
  ),
  deduped AS (
    SELECT DISTINCT ON (id)
      id, first_name, last_name, headline, location,
      last_interaction, latitude, longitude, updated_at, has_avatar
    FROM geocoded
    ORDER BY id, updated_at DESC
  )
  SELECT
    id, first_name, last_name, headline, location,
    last_interaction, latitude, longitude, updated_at, has_avatar
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
