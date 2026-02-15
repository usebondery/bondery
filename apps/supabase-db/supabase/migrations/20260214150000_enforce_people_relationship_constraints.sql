-- Enforce people relationship constraints on existing environments
-- 1) Ensure no self-link relationships (A -> A)
-- 2) Restrict relationship type values, including neighbor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'people_relationships_no_self_link'
      AND conrelid = 'public.people_relationships'::regclass
  ) THEN
    ALTER TABLE public.people_relationships
      ADD CONSTRAINT people_relationships_no_self_link
      CHECK (source_person_id <> target_person_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'people_relationships_relationship_type_check'
      AND conrelid = 'public.people_relationships'::regclass
  ) THEN
    ALTER TABLE public.people_relationships
      ADD CONSTRAINT people_relationships_relationship_type_check
      CHECK (
        relationship_type = ANY (
          ARRAY[
            'parent',
            'child',
            'spouse',
            'partner',
            'sibling',
            'friend',
            'colleague',
            'neighbor',
            'guardian',
            'dependent',
            'other'
          ]::text[]
        )
      );
  END IF;
END $$;
