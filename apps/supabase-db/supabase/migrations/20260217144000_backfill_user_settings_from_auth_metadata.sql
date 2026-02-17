-- Backfill missing user_settings profile fields from auth metadata
-- Migration: 20260217144000_backfill_user_settings_from_auth_metadata

UPDATE public.user_settings AS settings
SET
  name = COALESCE(
    NULLIF(BTRIM(settings.name), ''),
    metadata.given_name,
    metadata.full_name_first_name
  ),
  surname = COALESCE(
    NULLIF(BTRIM(settings.surname), ''),
    metadata.family_name,
    metadata.full_name_rest
  ),
  avatar_url = COALESCE(
    NULLIF(BTRIM(settings.avatar_url), ''),
    metadata.avatar_url
  )
FROM (
  SELECT
    users.id AS user_id,
    NULLIF(BTRIM(COALESCE(users.raw_user_meta_data->>'given_name', '')), '') AS given_name,
    NULLIF(BTRIM(COALESCE(users.raw_user_meta_data->>'family_name', '')), '') AS family_name,
    NULLIF(BTRIM(COALESCE(users.raw_user_meta_data->>'avatar_url', users.raw_user_meta_data->>'picture', '')), '') AS avatar_url,
    NULLIF(
      split_part(
        NULLIF(BTRIM(COALESCE(users.raw_user_meta_data->>'name', users.raw_user_meta_data->>'full_name', '')), ''),
        ' ',
        1
      ),
      ''
    ) AS full_name_first_name,
    NULLIF(
      BTRIM(
        substring(
          NULLIF(BTRIM(COALESCE(users.raw_user_meta_data->>'name', users.raw_user_meta_data->>'full_name', '')), '')
          from length(
            split_part(
              NULLIF(BTRIM(COALESCE(users.raw_user_meta_data->>'name', users.raw_user_meta_data->>'full_name', '')), ''),
              ' ',
              1
            )
          ) + 1
        )
      ),
      ''
    ) AS full_name_rest
  FROM auth.users AS users
) AS metadata
WHERE settings.user_id = metadata.user_id
  AND (
    (NULLIF(BTRIM(settings.name), '') IS NULL AND (metadata.given_name IS NOT NULL OR metadata.full_name_first_name IS NOT NULL))
    OR (NULLIF(BTRIM(settings.surname), '') IS NULL AND (metadata.family_name IS NOT NULL OR metadata.full_name_rest IS NOT NULL))
    OR (NULLIF(BTRIM(settings.avatar_url), '') IS NULL AND metadata.avatar_url IS NOT NULL)
  );