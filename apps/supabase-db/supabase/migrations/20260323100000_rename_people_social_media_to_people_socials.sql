-- Rename people_social_media table to people_socials to align with updated naming convention

-- 1. Rename the table
ALTER TABLE public.people_social_media RENAME TO people_socials;

-- 2. Rename constraints
ALTER TABLE public.people_socials RENAME CONSTRAINT people_social_media_pkey TO people_socials_pkey;
ALTER TABLE public.people_socials RENAME CONSTRAINT people_social_media_user_id_fkey TO people_socials_user_id_fkey;
ALTER TABLE public.people_socials RENAME CONSTRAINT people_social_media_person_id_fkey TO people_socials_person_id_fkey;
ALTER TABLE public.people_socials RENAME CONSTRAINT people_social_media_platform_check TO people_socials_platform_check;
ALTER TABLE public.people_socials RENAME CONSTRAINT people_social_media_handle_nonempty_check TO people_socials_handle_nonempty_check;

-- 3. Rename indexes
ALTER INDEX public.people_social_media_unique_platform_per_person_idx RENAME TO people_socials_unique_platform_per_person_idx;
ALTER INDEX public.people_social_media_user_id_idx RENAME TO people_socials_user_id_idx;
ALTER INDEX public.people_social_media_person_id_idx RENAME TO people_socials_person_id_idx;
ALTER INDEX public.people_social_media_platform_idx RENAME TO people_socials_platform_idx;
ALTER INDEX public.people_social_media_connected_at_idx RENAME TO people_socials_connected_at_idx;

-- 4. Rename trigger
ALTER TRIGGER people_social_media_updated_at ON public.people_socials RENAME TO people_socials_updated_at;

-- 5. Drop and recreate RLS policies with updated names
DROP POLICY IF EXISTS "Users can view their own people social media" ON public.people_socials;
CREATE POLICY "Users can view their own people socials"
  ON public.people_socials
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own people social media" ON public.people_socials;
CREATE POLICY "Users can insert their own people socials"
  ON public.people_socials
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own people social media" ON public.people_socials;
CREATE POLICY "Users can update their own people socials"
  ON public.people_socials
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own people social media" ON public.people_socials;
CREATE POLICY "Users can delete their own people socials"
  ON public.people_socials
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
