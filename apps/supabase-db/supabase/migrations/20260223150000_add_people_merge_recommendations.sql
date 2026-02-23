-- Store persisted merge recommendations to avoid recomputing on every fetch

CREATE TABLE IF NOT EXISTS public.people_merge_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  left_person_id uuid NOT NULL,
  right_person_id uuid NOT NULL,
  is_declined boolean NOT NULL DEFAULT false,
  score double precision NOT NULL DEFAULT 0,
  reasons text[] NOT NULL DEFAULT '{}'::text[],
  algorithm_version text NOT NULL DEFAULT 'v1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_merge_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT people_merge_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_merge_recommendations_left_person_id_fkey FOREIGN KEY (left_person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_merge_recommendations_right_person_id_fkey FOREIGN KEY (right_person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_merge_recommendations_no_self_pair CHECK (left_person_id <> right_person_id),
  CONSTRAINT people_merge_recommendations_sorted_pair CHECK (left_person_id < right_person_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS people_merge_recommendations_unique_pair_idx
  ON public.people_merge_recommendations(user_id, left_person_id, right_person_id);

CREATE INDEX IF NOT EXISTS people_merge_recommendations_user_id_idx
  ON public.people_merge_recommendations(user_id);

CREATE INDEX IF NOT EXISTS people_merge_recommendations_user_declined_idx
  ON public.people_merge_recommendations(user_id, is_declined);

CREATE INDEX IF NOT EXISTS people_merge_recommendations_score_idx
  ON public.people_merge_recommendations(user_id, score DESC);

ALTER TABLE public.people_merge_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own merge recommendations"
  ON public.people_merge_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own merge recommendations"
  ON public.people_merge_recommendations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people left_person
      WHERE left_person.id = left_person_id
        AND left_person.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.people right_person
      WHERE right_person.id = right_person_id
        AND right_person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own merge recommendations"
  ON public.people_merge_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people left_person
      WHERE left_person.id = left_person_id
        AND left_person.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.people right_person
      WHERE right_person.id = right_person_id
        AND right_person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own merge recommendations"
  ON public.people_merge_recommendations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER people_merge_recommendations_updated_at
  BEFORE UPDATE ON public.people_merge_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
