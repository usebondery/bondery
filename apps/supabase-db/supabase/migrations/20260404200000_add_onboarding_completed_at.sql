-- Add onboarding_completed_at to user_settings.
-- NULL  → user has NOT completed onboarding (new signup).
-- timestamp → user finished onboarding at that point in time.
--
-- Existing users are backfilled with NOW() so only truly new signups
-- will see the onboarding flow.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ NULL;

-- Backfill every existing user so they are NOT redirected to onboarding.
UPDATE public.user_settings
  SET onboarding_completed_at = NOW()
  WHERE onboarding_completed_at IS NULL;
