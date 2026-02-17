-- Migrate legacy profile-photos references to avatars bucket URLs
-- Migration: 20260217130000_migrate_profile_photos_to_avatars

-- Ensure avatars bucket exists in environments where it may be missing.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Rewrite user settings avatar URLs from profile-photos to avatars.
-- Target format is: /avatars/{user_id}/{user_id}.jpg
UPDATE public.user_settings
SET avatar_url = regexp_replace(
  avatar_url,
  '/profile-photos/([^/?]+)/[^?]+',
  '/avatars/\1/\1.jpg'
)
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/profile-photos/%';

-- Normalize any legacy querystring suffixes to avoid stale cache keys across bucket switch.
UPDATE public.user_settings
SET avatar_url = regexp_replace(avatar_url, '\?.*$', '')
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/avatars/%?%';

-- If rewritten avatar URL points to a missing object, clear it.
-- This allows API/settings fallback to auth provider metadata instead of a broken image URL.
UPDATE public.user_settings AS settings
SET avatar_url = NULL
WHERE settings.avatar_url LIKE '%/avatars/%'
  AND NOT EXISTS (
    SELECT 1
    FROM storage.objects AS storage_object
    WHERE storage_object.bucket_id = 'avatars'
      AND storage_object.name = settings.user_id || '/' || settings.user_id || '.jpg'
  );
