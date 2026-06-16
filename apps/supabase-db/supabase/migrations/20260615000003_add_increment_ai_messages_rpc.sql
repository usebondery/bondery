-- Atomic RPC to increment ai_messages_used in a single UPDATE statement.
-- Avoids the read-then-write race condition in application code.
-- Callable by authenticated users and service_role only.

CREATE OR REPLACE FUNCTION public.increment_ai_messages_used(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.user_settings
  SET ai_messages_used = ai_messages_used + 1
  WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_messages_used(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ai_messages_used(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_ai_messages_used(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_messages_used(uuid) TO service_role;
