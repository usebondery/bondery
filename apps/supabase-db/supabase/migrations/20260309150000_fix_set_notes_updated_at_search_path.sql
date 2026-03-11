-- Fix mutable search_path on set_notes_updated_at trigger function.
-- The function was created after the bulk hardening migration so it was not caught by it.

ALTER FUNCTION public.set_notes_updated_at() SET search_path = pg_catalog, public;
