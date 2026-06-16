-- Fix infinite recursion (42P17) in "Users cannot self-promote to admin" policy.
--
-- The original WITH CHECK subquery read from user_settings while RLS was
-- already evaluating a policy on user_settings, causing infinite recursion
-- on every UPDATE (including harmless changes like color_scheme).
--
-- Fix: wrap the is_admin lookup in a SECURITY DEFINER function so it runs
-- as the function owner and bypasses RLS, breaking the cycle.

DROP POLICY IF EXISTS "Users cannot self-promote to admin" ON public.user_settings;

CREATE OR REPLACE FUNCTION public.get_user_settings_is_admin(p_row_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_admin FROM public.user_settings WHERE id = p_row_id;
$$;

CREATE POLICY "Users cannot self-promote to admin"
  ON public.user_settings
  AS RESTRICTIVE
  FOR UPDATE
  USING (true)
  WITH CHECK (
    is_admin IS NOT DISTINCT FROM public.get_user_settings_is_admin(id)
  );
