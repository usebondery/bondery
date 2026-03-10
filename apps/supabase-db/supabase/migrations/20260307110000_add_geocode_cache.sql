-- Shared geocode cache — stores LinkedIn place string → geocoded result + timezone.
-- Public data (not user-scoped), no RLS required.
-- Entries are considered stale after 180 days (TTL enforced in application code).

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lookup key: lowercased + trimmed version of the LinkedIn place string
  place_key    text NOT NULL,

  -- Original place string (preserves casing for debugging / display)
  place_original text NOT NULL,

  -- Whether the geocode API returned a result.
  -- When false the remaining geo columns are NULL (negative cache).
  geocode_found boolean NOT NULL DEFAULT false,

  -- Geocode result columns (NULL when geocode_found = false)
  lat               double precision,
  lon               double precision,
  location_ewkt     text,
  name              text,
  city              text,
  state             text,
  state_code        text,
  country           text,
  country_code      text,
  formatted_label   text,

  -- Timezone resolved from lat/lon (NULL when geocode_found = false or lookup failed)
  timezone          text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Unique index on the normalised key for fast lookups and upsert conflict target
CREATE UNIQUE INDEX IF NOT EXISTS geocode_cache_place_key_idx
  ON public.geocode_cache (place_key);

-- No RLS — this is shared public data, accessed only by the API server via admin client
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- Allow the service-role (admin) client full access; regular authenticated
-- users have no direct access (all interaction goes through the API server).
CREATE POLICY "Service role full access"
  ON public.geocode_cache
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
