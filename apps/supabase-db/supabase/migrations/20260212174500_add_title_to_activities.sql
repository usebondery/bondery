-- Add title to activities so event cards can display dedicated event title
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS title text;
