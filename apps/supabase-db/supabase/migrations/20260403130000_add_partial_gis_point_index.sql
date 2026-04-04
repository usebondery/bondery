-- Add a partial composite index to efficiently serve map bounding-box queries.
-- Covers the (user_id, latitude, longitude) lookup pattern used by
-- get_map_pins_in_bbox(), while excluding rows that have no geocoded point.

CREATE INDEX IF NOT EXISTS idx_people_user_lat_lon
  ON public.people (user_id, latitude, longitude)
  WHERE gis_point IS NOT NULL;
