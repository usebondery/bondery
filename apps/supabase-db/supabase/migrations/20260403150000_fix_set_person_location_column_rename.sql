-- Fix set_person_location after the geo_location → gis_point column rename
-- (migration 20260322100000_rename_gis_point_columns.sql renamed the column but
-- did not update the function body, causing a 500 error on every location update).

CREATE OR REPLACE FUNCTION public.set_person_location(
  p_person_id uuid,
  p_user_id   uuid,
  p_latitude  double precision,
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
    gis_point = CASE
      WHEN p_latitude IS NULL OR p_longitude IS NULL THEN NULL
      ELSE extensions.ST_SetSRID(
             extensions.ST_MakePoint(p_longitude, p_latitude),
             4326
           )::extensions.geography
    END,
    updated_at = now()
  WHERE id      = p_person_id
    AND user_id = p_user_id;
END;
$$;

REVOKE EXECUTE
  ON FUNCTION public.set_person_location(uuid, uuid, double precision, double precision)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.set_person_location(uuid, uuid, double precision, double precision)
  TO authenticated;
