-- Fix monthly AI message quota: atomic check+increment, billing-period reset trigger,
-- backfill existing subscribers, and free-user counter isolation.
--
-- Addresses:
--   #1  TOCTOU race: replace two-step check+increment with a single atomic RPC.
--   #3  Billing renewal: DB trigger resets monthly counter when current_period_end advances.
--   #6  Backfill: set ai_messages_month_reset_at from actual subscription period start.
--   #8  Free-user waste: monthly counter only incremented for subscribed users.

-- ── 1. Add current_period_start to subscriptions ─────────────────────────────
-- Needed so the trigger can write the correct period-start timestamp to
-- user_settings when a renewal is detected.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone;

-- Backfill: derive period start from period end minus 30 days for existing rows.
UPDATE public.subscriptions
  SET current_period_start = current_period_end - interval '30 days'
  WHERE current_period_end IS NOT NULL
    AND current_period_start IS NULL;

-- ── 2. Backfill ai_messages_month_reset_at for currently-subscribed users ─────
-- Previously defaulted to the migration run date (2026-06-16). Use the actual
-- subscription period start so the 30-day window aligns with billing.

UPDATE public.user_settings us
  SET ai_messages_month_reset_at = s.current_period_start
  FROM public.subscriptions s
  WHERE s.user_id = us.user_id
    AND s.status IN ('active', 'canceling')
    AND s.current_period_start IS NOT NULL;

-- ── 3. Atomic check-and-increment RPC (#1 fix) ────────────────────────────────
-- Returns (allowed bool, messages_used int, reset_at timestamptz).
-- The entire check + increment happens in a single UPDATE … RETURNING, so
-- concurrent requests cannot both pass the limit check.
--
-- For premium users (has active/canceling subscription row):
--   - Lazily resets the monthly counter if 30+ days have elapsed.
--   - Increments, then checks whether the new total exceeds the limit.
--   - Returns allowed=false WITHOUT rolling back if over limit, so the caller
--     can fast-reject. The caller must NOT stream if allowed=false.
--
-- For free users the monthly columns are left untouched; only ai_messages_used
-- is returned so the caller can enforce the lifetime cap. (#8 fix)

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_messages(
  p_user_id    uuid,
  p_is_premium boolean,
  p_limit      integer
)
RETURNS TABLE (
  allowed       boolean,
  messages_used integer,
  reset_at      timestamptz
) AS $$
DECLARE
  v_used      integer;
  v_reset_at  timestamptz;
BEGIN
  IF p_is_premium THEN
    -- Atomic reset-if-expired + increment for premium users
    UPDATE public.user_settings
    SET
      ai_messages_used = ai_messages_used + 1,
      ai_messages_this_month = CASE
        WHEN now() > ai_messages_month_reset_at + interval '30 days' THEN 1
        ELSE ai_messages_this_month + 1
      END,
      ai_messages_month_reset_at = CASE
        WHEN now() > ai_messages_month_reset_at + interval '30 days' THEN now()
        ELSE ai_messages_month_reset_at
      END
    WHERE user_id = p_user_id
    RETURNING ai_messages_this_month, ai_messages_month_reset_at
      INTO v_used, v_reset_at;

    RETURN QUERY SELECT
      v_used <= p_limit,
      v_used,
      v_reset_at + interval '30 days';  -- return period END, not start
  ELSE
    -- Free users: only increment the lifetime counter; leave monthly columns alone
    UPDATE public.user_settings
    SET ai_messages_used = ai_messages_used + 1
    WHERE user_id = p_user_id
    RETURNING ai_messages_used INTO v_used;

    RETURN QUERY SELECT
      v_used <= p_limit,
      v_used,
      NULL::timestamptz;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.check_and_increment_ai_messages(uuid, boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_messages(uuid, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_messages(uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_messages(uuid, boolean, integer) TO service_role;

-- ── 4. Billing-renewal trigger (#3 fix) ──────────────────────────────────────
-- When a subscription row's current_period_end advances (= new billing period),
-- reset the monthly AI message counter in user_settings automatically.
-- This fires for both webhook-driven updates and the sync route.

CREATE OR REPLACE FUNCTION public.reset_monthly_quota_on_renewal()
RETURNS trigger AS $$
BEGIN
  -- Only act when current_period_end actually advances (new billing cycle).
  IF NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     AND NEW.current_period_end > COALESCE(OLD.current_period_end, '-infinity'::timestamptz)
  THEN
    UPDATE public.user_settings
    SET
      ai_messages_this_month    = 0,
      ai_messages_month_reset_at = COALESCE(NEW.current_period_start, now())
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS reset_monthly_quota_on_renewal ON public.subscriptions;

CREATE TRIGGER reset_monthly_quota_on_renewal
  AFTER UPDATE OF current_period_end ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_quota_on_renewal();
