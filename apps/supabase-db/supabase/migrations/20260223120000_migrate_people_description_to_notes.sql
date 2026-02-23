BEGIN;

UPDATE public.people
SET notes = CASE
  WHEN NULLIF(BTRIM(COALESCE(notes, '')), '') IS NULL THEN NULLIF(BTRIM(description), '')
  WHEN NULLIF(BTRIM(COALESCE(description, '')), '') IS NULL THEN notes
  ELSE notes || E'\n\n' || BTRIM(description)
END
WHERE description IS NOT NULL;

ALTER TABLE public.people
DROP COLUMN IF EXISTS description;

COMMIT;