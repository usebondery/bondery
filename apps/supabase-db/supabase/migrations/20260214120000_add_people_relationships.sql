-- Add people relationships feature
-- Stores directional relationships between two contacts owned by the same user

CREATE TABLE IF NOT EXISTS public.people_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_person_id uuid NOT NULL,
  target_person_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT people_relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_relationships_source_person_id_fkey FOREIGN KEY (source_person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_relationships_target_person_id_fkey FOREIGN KEY (target_person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_relationships_no_self_link CHECK (source_person_id <> target_person_id)
);

-- Prevent duplicate relation in same direction for same type
CREATE UNIQUE INDEX IF NOT EXISTS people_relationships_unique_direction_idx
  ON public.people_relationships(user_id, source_person_id, target_person_id, relationship_type);

-- Prevent reverse duplicate (A -> B and B -> A) for same type
CREATE UNIQUE INDEX IF NOT EXISTS people_relationships_unique_pair_type_idx
  ON public.people_relationships(
    user_id,
    LEAST(source_person_id, target_person_id),
    GREATEST(source_person_id, target_person_id),
    relationship_type
  );

CREATE INDEX IF NOT EXISTS people_relationships_user_id_idx
  ON public.people_relationships(user_id);

CREATE INDEX IF NOT EXISTS people_relationships_source_person_id_idx
  ON public.people_relationships(source_person_id);

CREATE INDEX IF NOT EXISTS people_relationships_target_person_id_idx
  ON public.people_relationships(target_person_id);

ALTER TABLE public.people_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people relationships"
  ON public.people_relationships
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people relationships"
  ON public.people_relationships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people source_person
      WHERE source_person.id = source_person_id
        AND source_person.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.people target_person
      WHERE target_person.id = target_person_id
        AND target_person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own people relationships"
  ON public.people_relationships
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people source_person
      WHERE source_person.id = source_person_id
        AND source_person.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.people target_person
      WHERE target_person.id = target_person_id
        AND target_person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own people relationships"
  ON public.people_relationships
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER people_relationships_updated_at
  BEFORE UPDATE ON public.people_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
