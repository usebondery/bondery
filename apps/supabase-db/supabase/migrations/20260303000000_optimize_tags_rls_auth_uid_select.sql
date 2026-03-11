-- Optimize RLS policies on public.tags and public.people_tags
-- Replace bare auth.uid() with (select auth.uid()) so the value is evaluated
-- once per statement rather than once per row, improving query performance.

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;

CREATE POLICY "Users can view their own tags"
  ON public.tags
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own tags"
  ON public.tags
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PEOPLE_TAGS JOIN TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own people_tags" ON public.people_tags;
DROP POLICY IF EXISTS "Users can insert their own people_tags" ON public.people_tags;
DROP POLICY IF EXISTS "Users can update their own people_tags" ON public.people_tags;
DROP POLICY IF EXISTS "Users can delete their own people_tags" ON public.people_tags;

CREATE POLICY "Users can view their own people_tags"
  ON public.people_tags
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own people_tags"
  ON public.people_tags
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own people_tags"
  ON public.people_tags
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own people_tags"
  ON public.people_tags
  FOR DELETE
  USING ((select auth.uid()) = user_id);
