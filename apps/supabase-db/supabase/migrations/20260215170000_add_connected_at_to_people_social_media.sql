ALTER TABLE public.people_social_media
  ADD COLUMN IF NOT EXISTS connected_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS people_social_media_connected_at_idx
  ON public.people_social_media(connected_at);
