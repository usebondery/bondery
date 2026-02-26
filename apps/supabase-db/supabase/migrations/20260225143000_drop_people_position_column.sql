-- Drop legacy unused profile columns from people table.
-- Spatial contact coordinates are stored in location geography + generated latitude/longitude.

ALTER TABLE public.people
DROP COLUMN IF EXISTS position,
DROP COLUMN IF EXISTS avatar_color,
DROP COLUMN IF EXISTS pgp_public_key,
DROP COLUMN IF EXISTS nickname,
DROP COLUMN IF EXISTS gender,
DROP COLUMN IF EXISTS connections;
