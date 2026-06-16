-- Remove name, middlename, surname columns from user_settings.
-- These fields are now exclusively stored on the "myself" contact in the people table.

ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS middlename,
  DROP COLUMN IF EXISTS surname;

-- Update handle_new_user() to no longer insert name fields into user_settings.
-- Name/surname already get written to the myself contact (people table) below.
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
  resolved_timezone text;
  resolved_time_format text;
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

  -- Read timezone from metadata if available, validate against pg_timezone_names
  resolved_timezone := NULLIF(BTRIM(COALESCE(metadata->>'timezone', '')), '');
  IF resolved_timezone IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = resolved_timezone) THEN
      resolved_timezone := 'UTC';
    END IF;
  ELSE
    resolved_timezone := 'UTC';
  END IF;

  -- Read time format from metadata if available, validate against allowed values
  resolved_time_format := NULLIF(BTRIM(COALESCE(metadata->>'time_format', '')), '');
  IF resolved_time_format NOT IN ('12h', '24h') OR resolved_time_format IS NULL THEN
    resolved_time_format := '24h';
  END IF;

  INSERT INTO public.user_settings (
    user_id,
    avatar_url,
    language,
    timezone,
    time_format,
    color_scheme
  )
  VALUES (
    NEW.id,
    resolved_avatar_url,
    'en',
    resolved_timezone,
    resolved_time_format,
    'auto'
  );

  -- Create the "myself" contact with id = user_id so that the avatar path
  -- avatars/{user_id}/{person_id}.jpg is the same as the settings avatar path.
  INSERT INTO public.people (
    id,
    user_id,
    first_name,
    last_name,
    myself,
    last_interaction
  )
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(resolved_name, ''),
    resolved_surname,
    true,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
