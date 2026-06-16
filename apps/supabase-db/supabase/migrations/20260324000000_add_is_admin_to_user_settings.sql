-- Add is_admin flag to user_settings for admin-only features (e.g. KPIs dashboard)
-- Only service-role can write this column — users cannot self-promote.

ALTER TABLE public.user_settings
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- RLS: all authenticated users can read their own is_admin flag
-- (existing SELECT policy on user_settings already covers this)

-- RLS: prevent users from setting is_admin via client-side updates.
-- The existing UPDATE policy allows users to update their own rows,
-- so we add a check that is_admin cannot be changed from its current value.
-- Admin promotion must happen via service-role or direct DB access.
CREATE POLICY "Users cannot self-promote to admin"
  ON public.user_settings
  AS RESTRICTIVE
  FOR UPDATE
  USING (true)
  WITH CHECK (
    is_admin IS NOT DISTINCT FROM (
      SELECT us.is_admin FROM public.user_settings us WHERE us.id = id
    )
  );
