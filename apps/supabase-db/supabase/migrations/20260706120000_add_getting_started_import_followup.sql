-- Getting started ProgressRail + import follow-up state on user_settings.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS import_followup_status TEXT NULL
    CHECK (import_followup_status IN ('awaiting_export', 'dismissed')),
  ADD COLUMN IF NOT EXISTS import_followup_platform TEXT NULL
    CHECK (import_followup_platform IN ('linkedin', 'instagram')),
  ADD COLUMN IF NOT EXISTS import_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS getting_started_dismissed_at TIMESTAMPTZ NULL;

-- Existing users should not see the getting-started rail.
UPDATE public.user_settings
  SET getting_started_dismissed_at = NOW()
  WHERE getting_started_dismissed_at IS NULL;
