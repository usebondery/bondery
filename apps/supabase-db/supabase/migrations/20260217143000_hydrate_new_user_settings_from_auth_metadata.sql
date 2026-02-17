-- Hydrate user_settings defaults from auth metadata for new signups
-- Migration: 20260217143000_hydrate_new_user_settings_from_auth_metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  metadata_given_name text;
  metadata_family_name text;
  metadata_full_name text;
  resolved_name text;
  resolved_surname text;
  resolved_avatar_url text;
BEGIN
  metadata_given_name := NULLIF(BTRIM(COALESCE(metadata->>'given_name', '')), '');
  metadata_family_name := NULLIF(BTRIM(COALESCE(metadata->>'family_name', '')), '');
  metadata_full_name := NULLIF(
    BTRIM(COALESCE(metadata->>'name', metadata->>'full_name', '')),
    ''
  );

  resolved_name := metadata_given_name;
  resolved_surname := metadata_family_name;

  IF resolved_name IS NULL AND metadata_full_name IS NOT NULL THEN
    resolved_name := NULLIF(split_part(metadata_full_name, ' ', 1), '');
    resolved_surname := NULLIF(BTRIM(substring(metadata_full_name from length(split_part(metadata_full_name, ' ', 1)) + 1)), '');
  END IF;

  resolved_avatar_url := NULLIF(
    BTRIM(COALESCE(metadata->>'avatar_url', metadata->>'picture', '')),
    ''
  );

  INSERT INTO public.user_settings (
    user_id,
    name,
    middlename,
    surname,
    avatar_url,
    language,
    timezone,
    color_scheme
  )
  VALUES (
    NEW.id,
    resolved_name,
    '',
    resolved_surname,
    resolved_avatar_url,
    'en',
    'UTC',
    'auto'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;