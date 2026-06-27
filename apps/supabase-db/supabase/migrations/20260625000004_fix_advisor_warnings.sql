-- Fix Supabase advisor warnings (local linter):
--   - auth_rls_initplan: wrap auth.uid() in (select auth.uid()) on chat + subscriptions RLS
--   - function_search_path_mutable: pin search_path on AI quota functions

-- ── RLS initplan: chat_sessions ──────────────────────────────────────────────

ALTER POLICY "Users can view their own chat_sessions"
  ON public.chat_sessions
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own chat_sessions"
  ON public.chat_sessions
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own chat_sessions"
  ON public.chat_sessions
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete their own chat_sessions"
  ON public.chat_sessions
  USING ((select auth.uid()) = user_id);

-- ── RLS initplan: chat_messages ──────────────────────────────────────────────

ALTER POLICY "Users can view their own chat_messages"
  ON public.chat_messages
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = chat_messages.session_id
      AND cs.user_id = (select auth.uid())
  ));

ALTER POLICY "Users can insert their own chat_messages"
  ON public.chat_messages
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = chat_messages.session_id
      AND cs.user_id = (select auth.uid())
  ));

ALTER POLICY "Users can delete their own chat_messages"
  ON public.chat_messages
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = chat_messages.session_id
      AND cs.user_id = (select auth.uid())
  ));

-- ── RLS initplan: subscriptions ────────────────────────────────────────────────

ALTER POLICY "Users can view their own subscription"
  ON public.subscriptions
  USING ((select auth.uid()) = user_id);

-- ── Function search_path: AI quota RPCs ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_ai_messages_used(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.user_settings
  SET ai_messages_used = ai_messages_used + 1
  WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_messages(
  p_user_id    uuid,
  p_is_premium boolean,
  p_limit      integer
)
RETURNS TABLE (
  allowed       boolean,
  messages_used integer,
  reset_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_used      integer;
  v_reset_at  timestamptz;
BEGIN
  IF p_is_premium THEN
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
      v_reset_at + interval '30 days';
  ELSE
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
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_quota_on_renewal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     AND NEW.current_period_end > COALESCE(OLD.current_period_end, '-infinity'::timestamptz)
  THEN
    UPDATE public.user_settings
    SET
      ai_messages_this_month     = 0,
      ai_messages_month_reset_at = COALESCE(NEW.current_period_start, now())
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
