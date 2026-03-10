-- Drop the avatar URL column from the people table.
-- The avatar URL is now constructed by the API directly from the Supabase
-- storage path pattern: avatars/{user_id}/{person_id}.jpg
-- The webapp handles missing files (HTTP 404) gracefully via Mantine Avatar
-- fallback to initials — the same strategy used for user and LinkedIn logos.
ALTER TABLE public.people DROP COLUMN IF EXISTS avatar;
