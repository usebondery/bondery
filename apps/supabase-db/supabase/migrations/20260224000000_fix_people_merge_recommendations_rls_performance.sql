-- Fix RLS performance: wrap auth.uid() in a subquery so it is evaluated once
-- per statement rather than once per row.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

DROP POLICY IF EXISTS "Users can view their own merge recommendations"   ON public.people_merge_recommendations;
DROP POLICY IF EXISTS "Users can insert their own merge recommendations"  ON public.people_merge_recommendations;
DROP POLICY IF EXISTS "Users can update their own merge recommendations"  ON public.people_merge_recommendations;
DROP POLICY IF EXISTS "Users can delete their own merge recommendations"  ON public.people_merge_recommendations;

CREATE POLICY "Users can view their own merge recommendations"
  ON public.people_merge_recommendations
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own merge recommendations"
  ON public.people_merge_recommendations
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people left_person
      WHERE left_person.id = left_person_id
        AND left_person.user_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.people right_person
      WHERE right_person.id = right_person_id
        AND right_person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own merge recommendations"
  ON public.people_merge_recommendations
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people left_person
      WHERE left_person.id = left_person_id
        AND left_person.user_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.people right_person
      WHERE right_person.id = right_person_id
        AND right_person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own merge recommendations"
  ON public.people_merge_recommendations
  FOR DELETE
  USING ((select auth.uid()) = user_id);
