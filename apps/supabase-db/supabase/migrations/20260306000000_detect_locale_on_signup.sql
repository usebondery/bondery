-- Update handle_new_user to read timezone and time_format from auth metadata
-- These values are set as a fallback; the primary path is the auth callback route
-- reading the locale_prefs cookie set by the login page.

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
    name,
    middlename,
    surname,
    avatar_url,
    language,
    timezone,
    time_format,
    color_scheme
  )
  VALUES (
    NEW.id,
    resolved_name,
    '',
    resolved_surname,
    resolved_avatar_url,
    'en',
    resolved_timezone,
    resolved_time_format,
    'auto'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
