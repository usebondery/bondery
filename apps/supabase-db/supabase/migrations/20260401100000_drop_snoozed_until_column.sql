-- Remove the snoozed_until column from the people table.
-- Snooze functionality has been removed from the app in favour of a simpler UX.
ALTER TABLE public.people
  DROP COLUMN IF EXISTS snoozed_until;
