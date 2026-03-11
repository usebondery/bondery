-- Rename person profile field from title to headline.

ALTER TABLE IF EXISTS public.people
  RENAME COLUMN title TO headline;
