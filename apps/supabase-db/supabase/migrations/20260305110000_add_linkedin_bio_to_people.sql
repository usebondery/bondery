-- Add linkedin_bio column to people table so scraped LinkedIn About section text
-- can be persisted alongside work history and education.

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS linkedin_bio text;
