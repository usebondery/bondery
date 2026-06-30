-- Add has_avatar flag to people table.
-- True when avatars/{user_id}/{id}.jpg exists in storage. Maintained by API write paths.
-- After deploy: run apps/api/scripts/backfill-has-avatar.ts to set flags for existing files.

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS has_avatar boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.people.has_avatar IS
  'True when avatars/{user_id}/{id}.jpg exists in storage. Maintained by API write paths.';

-- Postgres cannot change RETURNS TABLE via CREATE OR REPLACE; drop first.
DROP FUNCTION IF EXISTS public.get_map_pins_in_bbox(uuid, float8, float8, float8, float8, integer);

-- Extend get_map_pins_in_bbox to return has_avatar for avatar URL gating in the API.

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
  last_interaction text,
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
      p.last_interaction::text  AS last_interaction,
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
      p.last_interaction::text  AS last_interaction,
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

-- Extend get_map_address_pins_in_bbox to return has_avatar.

DROP FUNCTION IF EXISTS public.get_map_address_pins_in_bbox(uuid, float8, float8, float8, float8, integer);

CREATE FUNCTION public.get_map_address_pins_in_bbox(
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
  updated_at        timestamptz,
  has_avatar        boolean
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
    pa.updated_at,
    p.has_avatar
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
