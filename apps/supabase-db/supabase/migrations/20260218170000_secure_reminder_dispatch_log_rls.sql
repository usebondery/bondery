-- Secure reminder dispatch log with explicit row-level access rules.

ALTER TABLE public.reminder_dispatch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reminder dispatch logs" ON public.reminder_dispatch_log;
CREATE POLICY "Users can view their own reminder dispatch logs"
  ON public.reminder_dispatch_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
