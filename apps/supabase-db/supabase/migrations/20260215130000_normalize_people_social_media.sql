-- Normalize social media fields into dedicated table
-- Single cutover migration: create table, backfill, then drop legacy columns from people

CREATE TABLE IF NOT EXISTS public.people_social_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  platform text NOT NULL,
  handle text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_social_media_pkey PRIMARY KEY (id),
  CONSTRAINT people_social_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_social_media_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_social_media_platform_check CHECK (
    platform IN ('linkedin', 'instagram', 'whatsapp', 'facebook', 'website', 'signal')
  ),
  CONSTRAINT people_social_media_handle_nonempty_check CHECK (length(trim(handle)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS people_social_media_unique_platform_per_person_idx
  ON public.people_social_media(user_id, person_id, platform);

CREATE INDEX IF NOT EXISTS people_social_media_user_id_idx
  ON public.people_social_media(user_id);

CREATE INDEX IF NOT EXISTS people_social_media_person_id_idx
  ON public.people_social_media(person_id);

CREATE INDEX IF NOT EXISTS people_social_media_platform_idx
  ON public.people_social_media(platform);

ALTER TABLE public.people_social_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people social media"
  ON public.people_social_media
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people social media"
  ON public.people_social_media
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own people social media"
  ON public.people_social_media
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own people social media"
  ON public.people_social_media
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER people_social_media_updated_at
  BEFORE UPDATE ON public.people_social_media
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.people_social_media (user_id, person_id, platform, handle)
SELECT
  p.user_id,
  p.id,
  entry.platform,
  entry.handle
FROM public.people p
CROSS JOIN LATERAL (
  VALUES
    ('linkedin', NULLIF(trim(p.linkedin), '')),
    ('instagram', NULLIF(trim(p.instagram), '')),
    ('whatsapp', NULLIF(trim(p.whatsapp), '')),
    ('facebook', NULLIF(trim(p.facebook), '')),
    ('website', NULLIF(trim(p.website), '')),
    ('signal', NULLIF(trim(p.signal), ''))
) AS entry(platform, handle)
WHERE entry.handle IS NOT NULL
ON CONFLICT (user_id, person_id, platform)
DO UPDATE SET
  handle = EXCLUDED.handle,
  updated_at = now();

ALTER TABLE public.people
  DROP COLUMN IF EXISTS linkedin,
  DROP COLUMN IF EXISTS instagram,
  DROP COLUMN IF EXISTS whatsapp,
  DROP COLUMN IF EXISTS facebook,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS signal;
