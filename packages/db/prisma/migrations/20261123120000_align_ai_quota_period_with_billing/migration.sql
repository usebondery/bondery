-- Align the AI usage period with the billing period.
--
-- `user_settings.ai_messages_month_reset_at` is now the exclusive end of the
-- current usage period, not a free-running 30-day timer. Three changes:
--
--   1. The AI reset column becomes `timestamptz`. As `timestamp`, the value
--      depended on the session time zone whenever SQL or Prisma read it.
--   2. The Stripe mirror period bounds become `timestamptz` for the same reason.
--      `trial_ends_at` already is.
--   3. Premium rows take the period end from the Stripe mirror, so the reset
--      date matches the renewal date on the same screen.
--
-- Existing counters are kept: they count messages from the window that just
-- ended, so realigning the deadline never grants or removes a message.
-- Prisma wrote every `timestamp` value as a UTC wall clock; read it back the same way.

ALTER TABLE "user_settings"
  ALTER COLUMN "ai_messages_month_reset_at" TYPE TIMESTAMPTZ(3)
  USING ("ai_messages_month_reset_at" AT TIME ZONE 'UTC');

ALTER TABLE "subscriptions"
  ALTER COLUMN "current_period_start" TYPE TIMESTAMPTZ(3)
  USING ("current_period_start" AT TIME ZONE 'UTC');

ALTER TABLE "subscriptions"
  ALTER COLUMN "current_period_end" TYPE TIMESTAMPTZ(3)
  USING ("current_period_end" AT TIME ZONE 'UTC');

ALTER TABLE "pending_subscriptions"
  ALTER COLUMN "current_period_end" TYPE TIMESTAMPTZ(3)
  USING ("current_period_end" AT TIME ZONE 'UTC');

-- Premium rows: the usage window now ends when the paid period ends.
UPDATE "user_settings" AS settings
SET "ai_messages_month_reset_at" = subscription."current_period_end"
FROM "subscriptions" AS subscription
WHERE subscription."user_id" = settings."user_id"
  AND subscription."status" IN ('active', 'canceling', 'past_due')
  AND subscription."current_period_end" IS NOT NULL;
