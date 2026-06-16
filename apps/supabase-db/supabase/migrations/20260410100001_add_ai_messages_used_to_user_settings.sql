-- Add ai_messages_used counter to user_settings.
--
-- Tracks the total number of AI assistant messages a user has sent (lifetime).
-- Free-tier users are limited to 5 messages before requiring a subscription.
-- The counter is incremented server-side each time a user message is persisted.

ALTER TABLE public.user_settings
  ADD COLUMN ai_messages_used integer NOT NULL DEFAULT 0;

-- Backfill existing users: count their prior user-role chat messages so they
-- don't get extra free messages after this migration.
UPDATE public.user_settings us
SET ai_messages_used = COALESCE(
  (
    SELECT COUNT(*)::integer
    FROM public.chat_messages cm
    JOIN public.chat_sessions cs ON cs.id = cm.session_id
    WHERE cs.user_id = us.user_id AND cm.role = 'user'
  ),
  0
);
