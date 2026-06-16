-- Introduce a dedicated "canceling" status for subscriptions that are still active
-- but scheduled to cancel at the end of the billing period.
--
-- Previously, active + cancelAtPeriodEnd=true was stored as "canceled", which is
-- ambiguous — it looked identical to a truly-expired canceled subscription, requiring
-- a date check everywhere. "canceling" is unambiguous: full access until period end.

-- 1. Drop the old CHECK constraint
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- 2. Re-add the constraint with "canceling" included
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceling', 'canceled', 'revoked', 'past_due'));

-- 3. Backfill: rows that were active+cancelAtPeriodEnd=true are now "canceling"
UPDATE public.subscriptions
SET status = 'canceling'
WHERE status = 'canceled'
  AND cancel_at_period_end = true
  AND current_period_end IS NOT NULL
  AND current_period_end > now();
