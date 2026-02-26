-- Optimize people_addresses RLS policies to avoid per-row auth.uid() re-evaluation.
-- Wrap auth.uid() in a subquery, following Supabase advisor guidance.

DROP POLICY IF EXISTS "Users can view their own people addresses" ON public.people_addresses;
DROP POLICY IF EXISTS "Users can insert their own people addresses" ON public.people_addresses;
DROP POLICY IF EXISTS "Users can update their own people addresses" ON public.people_addresses;
DROP POLICY IF EXISTS "Users can delete their own people addresses" ON public.people_addresses;

CREATE POLICY "Users can view their own people addresses"
  ON public.people_addresses
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own people addresses"
  ON public.people_addresses
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own people addresses"
  ON public.people_addresses
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own people addresses"
  ON public.people_addresses
  FOR DELETE
  USING ((select auth.uid()) = user_id);
