-- Drop address fields that were denormalized onto people before people_addresses existed.
-- All data has been backfilled to people_addresses (20260225083000).
-- Reads come from people_addresses; these columns are duplicate writes only.

ALTER TABLE public.people
  DROP COLUMN IF EXISTS address_line1,
  DROP COLUMN IF EXISTS address_line2,
  DROP COLUMN IF EXISTS address_city,
  DROP COLUMN IF EXISTS address_postal_code,
  DROP COLUMN IF EXISTS address_state,
  DROP COLUMN IF EXISTS address_state_code,
  DROP COLUMN IF EXISTS address_country,
  DROP COLUMN IF EXISTS address_country_code,
  DROP COLUMN IF EXISTS address_granularity,
  DROP COLUMN IF EXISTS address_formatted,
  DROP COLUMN IF EXISTS address_geocode_source;

-- Drop the CHECK constraint that guarded address_granularity (column no longer exists).
ALTER TABLE public.people
  DROP CONSTRAINT IF EXISTS people_address_granularity_check;

-- Drop the two indexes that targeted the dropped columns.
DROP INDEX IF EXISTS public.people_user_country_code_idx;
DROP INDEX IF EXISTS public.people_user_granularity_idx;
