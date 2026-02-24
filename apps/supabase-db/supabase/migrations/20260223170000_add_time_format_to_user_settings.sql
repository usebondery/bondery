-- Add user-selectable time format preference (24h vs 12h)

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '24h';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_time_format_check'
      AND conrelid = 'public.user_settings'::regclass
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_time_format_check
      CHECK (time_format IN ('24h', '12h'));
  END IF;
END
$$;
