-- Fix duplicate FK constraint on people_important_dates.person_id.
--
-- Root cause: migration 20260326100000_align_myself_contact_id_to_user_id
-- tried to drop `people_important_events_person_id_fkey` (the OLD name) using
-- IF EXISTS, which was a no-op because migration 20260309130000 had already
-- renamed it to `people_important_dates_person_id_fkey`.  It then re-added
-- `people_important_events_person_id_fkey` as a brand-new constraint, leaving
-- two FK constraints between people_important_dates.person_id and people.id.
--
-- PostgREST treats this as an ambiguous relationship and returns a 500 error
-- whenever the API embeds the person relation (e.g. the /important-dates/upcoming
-- endpoint uses `person:people!inner(...)`).
--
-- Fix: drop the spurious duplicate constraint.

ALTER TABLE public.people_important_dates
  DROP CONSTRAINT IF EXISTS people_important_events_person_id_fkey;
