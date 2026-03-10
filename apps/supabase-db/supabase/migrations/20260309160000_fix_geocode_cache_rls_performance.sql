-- Fix RLS performance on geocode_cache: wrap auth.role() in (select ...)
-- to prevent per-row re-evaluation of the function call.

DROP POLICY IF EXISTS "Service role full access" ON public.geocode_cache;

CREATE POLICY "Service role full access"
  ON public.geocode_cache
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
