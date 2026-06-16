-- Rename GIS point columns to the unified name gis_point.
-- people.geo_location and people_addresses.location are both PostGIS geography columns
-- that store the same semantic concept; gis_point makes their purpose unambiguous.

ALTER TABLE public.people RENAME COLUMN geo_location TO gis_point;
ALTER INDEX IF EXISTS idx_people_geo_location RENAME TO idx_people_gis_point;
COMMENT ON COLUMN public.people.gis_point IS 'PostGIS geography point for spatial queries. EWKT populated from geocoded coordinates.';

ALTER TABLE public.people_addresses RENAME COLUMN location TO gis_point;
ALTER INDEX IF EXISTS people_addresses_location_idx RENAME TO people_addresses_gis_point_idx;
COMMENT ON COLUMN public.people_addresses.gis_point IS 'PostGIS geography point derived from latitude/longitude via GENERATED ALWAYS. Use for spatial queries.';
