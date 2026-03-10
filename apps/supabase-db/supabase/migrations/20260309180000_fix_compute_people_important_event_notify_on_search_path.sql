-- Fix mutable search_path on compute_people_important_event_notify_on trigger function.
-- The function was recreated in 20260309170000 after the bulk hardening migration so it was not caught by it.

ALTER FUNCTION public.compute_people_important_event_notify_on() SET search_path = pg_catalog, public;
