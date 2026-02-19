-- Drop deprecated activity columns no longer used by the UI.

ALTER TABLE public.activities
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS attachment_path;
