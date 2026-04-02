-- Add keep-in-touch reminder columns to the people table.
--
-- keep_frequency_days: number of days between desired follow-ups (e.g. 7 = weekly).
--   NULL means the user has not set a keep-in-touch frequency for this contact.
-- snoozed_until: when set, hides the contact from the keep-in-touch page
--   until this timestamp has passed.

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS keep_frequency_days integer,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

-- Partial index: only contacts that have a keep-in-touch frequency set.
-- Speeds up the keep-in-touch page query which filters on keep_frequency_days IS NOT NULL.
CREATE INDEX IF NOT EXISTS idx_people_keep_frequency
  ON public.people (user_id, keep_frequency_days)
  WHERE keep_frequency_days IS NOT NULL;
