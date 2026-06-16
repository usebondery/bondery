-- Create chat session history tables.
--
-- chat_sessions: one row per conversation the user starts with the AI assistant.
-- chat_messages: one row per user or assistant message within a session.
-- Messages are stored as JSONB (full UIMessage structure from @ai-sdk/react)
-- so the frontend can reconstruct the conversation exactly.

-- ============================================================================
-- CHAT_SESSIONS TABLE
-- ============================================================================

CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for listing sessions ordered by most recent activity
CREATE INDEX chat_sessions_user_id_updated_at_idx
  ON public.chat_sessions (user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat_sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat_sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- ============================================================================

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- Index for loading messages in chronological order within a session
CREATE INDEX chat_messages_session_id_created_at_idx
  ON public.chat_messages (session_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS via join to chat_sessions to enforce user_id ownership
CREATE POLICY "Users can view their own chat_messages"
  ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = chat_messages.session_id AND cs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = chat_messages.session_id AND cs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own chat_messages"
  ON public.chat_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = chat_messages.session_id AND cs.user_id = auth.uid()
  ));
