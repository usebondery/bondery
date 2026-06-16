-- Add monthly AI message quota tracking to user_settings.
--
-- ai_messages_this_month  : rolling counter reset each billing period (premium)
--                           or calendar month (free).
-- ai_messages_month_reset_at : timestamp when the current period started.
--                              The increment RPC uses this to lazily reset the counter.

ALTER TABLE public.user_settings
  ADD COLUMN ai_messages_this_month    integer     NOT NULL DEFAULT 0,
  ADD COLUMN ai_messages_month_reset_at timestamptz NOT NULL DEFAULT now();

-- Update the increment RPC to also maintain the monthly counter.
-- If >30 days have elapsed since ai_messages_month_reset_at, the counter resets
-- atomically in the same UPDATE that increments it (no read-then-write race).
CREATE OR REPLACE FUNCTION public.increment_ai_messages_used(p_user_id uuid)
RETURNS void AS $$
BEGIN
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
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
