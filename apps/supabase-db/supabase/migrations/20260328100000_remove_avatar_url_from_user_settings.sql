-- Remove avatar_url column from user_settings.
-- Avatar URLs are now derived deterministically from storage path
-- {userId}/{userId}.jpg, following the same pattern as contact avatars.
-- This eliminates redundancy and prevents stale cached URLs.

ALTER TABLE public.user_settings DROP COLUMN IF EXISTS avatar_url;
