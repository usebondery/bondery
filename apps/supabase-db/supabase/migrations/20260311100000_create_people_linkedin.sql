-- Create the people_linkedin table to consolidate all LinkedIn profile data
-- (bio + sync tracking) and serve as the parent for work/education history.
--
-- After this migration:
--   people_linkedin 1:1 with people (one row per person with LinkedIn data)
--   people_work_history.people_linkedin_id FK → people_linkedin
--   people_education_history.people_linkedin_id FK → people_linkedin
--   people.linkedin_bio column dropped

-- ============================================================================
-- 1. CREATE people_linkedin TABLE
-- ============================================================================

CREATE TABLE public.people_linkedin (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_linkedin_pkey PRIMARY KEY (id),
  CONSTRAINT people_linkedin_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_linkedin_person_id_fkey FOREIGN KEY (person_id)
    REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_linkedin_user_person_unique UNIQUE (user_id, person_id)
);

CREATE INDEX people_linkedin_user_id_idx
  ON public.people_linkedin(user_id);

CREATE INDEX people_linkedin_person_id_idx
  ON public.people_linkedin(person_id);

ALTER TABLE public.people_linkedin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people linkedin"
  ON public.people_linkedin
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own people linkedin"
  ON public.people_linkedin
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = person_id
        AND p.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own people linkedin"
  ON public.people_linkedin
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own people linkedin"
  ON public.people_linkedin
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER people_linkedin_updated_at
  BEFORE UPDATE ON public.people_linkedin
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. MIGRATE EXISTING DATA INTO people_linkedin
--    Insert a row for every person that has linkedin_bio, work history,
--    or education history. Set updated_at from the latest child record.
-- ============================================================================

INSERT INTO public.people_linkedin (user_id, person_id, bio, updated_at)
SELECT
  combined.user_id,
  combined.person_id,
  combined.bio,
  COALESCE(combined.max_updated, now()) AS updated_at
FROM (
  SELECT
    p.user_id,
    p.id AS person_id,
    p.linkedin_bio AS bio,
    GREATEST(
      (SELECT MAX(wh.updated_at) FROM public.people_work_history wh
       WHERE wh.person_id = p.id AND wh.user_id = p.user_id),
      (SELECT MAX(eh.updated_at) FROM public.people_education_history eh
       WHERE eh.person_id = p.id AND eh.user_id = p.user_id)
    ) AS max_updated
  FROM public.people p
  WHERE p.linkedin_bio IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.people_work_history wh
                WHERE wh.person_id = p.id AND wh.user_id = p.user_id)
     OR EXISTS (SELECT 1 FROM public.people_education_history eh
                WHERE eh.person_id = p.id AND eh.user_id = p.user_id)
) combined;

-- ============================================================================
-- 3. ADD people_linkedin_id FK TO WORK HISTORY AND EDUCATION HISTORY
-- ============================================================================

-- 3a. Add nullable column first
ALTER TABLE public.people_work_history
  ADD COLUMN people_linkedin_id uuid;

ALTER TABLE public.people_education_history
  ADD COLUMN people_linkedin_id uuid;

-- 3b. Populate from the just-created people_linkedin rows
UPDATE public.people_work_history wh
SET people_linkedin_id = pl.id
FROM public.people_linkedin pl
WHERE wh.user_id = pl.user_id
  AND wh.person_id = pl.person_id;

UPDATE public.people_education_history eh
SET people_linkedin_id = pl.id
FROM public.people_linkedin pl
WHERE eh.user_id = pl.user_id
  AND eh.person_id = pl.person_id;

-- 3c. Add FK constraint and NOT NULL (all rows should now be populated)
ALTER TABLE public.people_work_history
  ALTER COLUMN people_linkedin_id SET NOT NULL,
  ADD CONSTRAINT people_work_history_people_linkedin_id_fkey
    FOREIGN KEY (people_linkedin_id)
    REFERENCES public.people_linkedin(id) ON DELETE CASCADE;

ALTER TABLE public.people_education_history
  ALTER COLUMN people_linkedin_id SET NOT NULL,
  ADD CONSTRAINT people_education_history_people_linkedin_id_fkey
    FOREIGN KEY (people_linkedin_id)
    REFERENCES public.people_linkedin(id) ON DELETE CASCADE;

-- 3d. Create indexes for the new FK
CREATE INDEX people_work_history_people_linkedin_id_idx
  ON public.people_work_history(people_linkedin_id);

CREATE INDEX people_education_history_people_linkedin_id_idx
  ON public.people_education_history(people_linkedin_id);

-- 3e. Drop old person_id column and its indexes/constraints from both tables
--     (user_id is kept for RLS performance)

-- Drop RLS policies that reference person_id BEFORE dropping the column
DROP POLICY IF EXISTS "Users can insert their own people work history"
  ON public.people_work_history;

DROP POLICY IF EXISTS "Users can update their own people work history"
  ON public.people_work_history;

DROP POLICY IF EXISTS "Users can insert their own people education history"
  ON public.people_education_history;

DROP POLICY IF EXISTS "Users can update their own people education history"
  ON public.people_education_history;

ALTER TABLE public.people_work_history
  DROP CONSTRAINT IF EXISTS people_work_history_person_id_fkey;

DROP INDEX IF EXISTS people_work_history_person_id_idx;
DROP INDEX IF EXISTS people_work_history_person_sort_idx;

ALTER TABLE public.people_work_history
  DROP COLUMN person_id;

ALTER TABLE public.people_education_history
  DROP CONSTRAINT IF EXISTS people_education_history_person_id_fkey;

-- The education table was originally people_education, so the FK constraint
-- may still have the old name
ALTER TABLE public.people_education_history
  DROP CONSTRAINT IF EXISTS people_education_person_id_fkey;

DROP INDEX IF EXISTS people_education_history_person_id_idx;
DROP INDEX IF EXISTS people_education_person_sort_idx;

ALTER TABLE public.people_education_history
  DROP COLUMN person_id;

-- 3f. Recreate sort index using people_linkedin_id
CREATE INDEX people_work_history_linkedin_sort_idx
  ON public.people_work_history(people_linkedin_id, start_date DESC NULLS LAST);

CREATE INDEX people_education_history_linkedin_sort_idx
  ON public.people_education_history(people_linkedin_id, start_date DESC NULLS LAST);

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR WORK/EDUCATION HISTORY
--    Insert/update policies referenced person_id; recreate with people_linkedin_id
-- ============================================================================

-- Work history: recreate insert/update policies
CREATE POLICY "Users can insert their own people work history"
  ON public.people_work_history
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.people_linkedin pl
      WHERE pl.id = people_linkedin_id
        AND pl.user_id = (select auth.uid())
    )
  );

-- Work history: recreate update policy
CREATE POLICY "Users can update their own people work history"
  ON public.people_work_history
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.people_linkedin pl
      WHERE pl.id = people_linkedin_id
        AND pl.user_id = (select auth.uid())
    )
  );

-- Education history: recreate insert/update policies
CREATE POLICY "Users can insert their own people education history"
  ON public.people_education_history
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.people_linkedin pl
      WHERE pl.id = people_linkedin_id
        AND pl.user_id = (select auth.uid())
    )
  );

-- Education history: recreate update policy
CREATE POLICY "Users can update their own people education history"
  ON public.people_education_history
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.people_linkedin pl
      WHERE pl.id = people_linkedin_id
        AND pl.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 5. DROP linkedin_bio FROM people TABLE
-- ============================================================================

ALTER TABLE public.people
  DROP COLUMN IF EXISTS linkedin_bio;

-- ============================================================================
-- 6. UPDATE RPC FUNCTIONS
--    Switch from (p_person_id, p_user_id) to (p_people_linkedin_id, p_user_id)
--    Must DROP first — CREATE OR REPLACE cannot rename parameters
-- ============================================================================

DROP FUNCTION IF EXISTS public.replace_work_history(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.replace_education_history(uuid, uuid, jsonb);

CREATE FUNCTION public.replace_work_history(
  p_people_linkedin_id uuid,
  p_user_id uuid,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.people_work_history
  WHERE people_linkedin_id = p_people_linkedin_id
    AND user_id = p_user_id;

  INSERT INTO public.people_work_history (
    user_id,
    people_linkedin_id,
    company_name,
    company_linkedin_id,
    title,
    description,
    start_date,
    end_date,
    employment_type,
    location
  )
  SELECT
    p_user_id,
    p_people_linkedin_id,
    (row_data ->> 'company_name')::text,
    (row_data ->> 'company_linkedin_id')::text,
    (row_data ->> 'title')::text,
    (row_data ->> 'description')::text,
    (row_data ->> 'start_date')::date,
    (row_data ->> 'end_date')::date,
    (row_data ->> 'employment_type')::text,
    (row_data ->> 'location')::text
  FROM jsonb_array_elements(p_rows) AS row_data;

  -- Touch the parent's updated_at timestamp
  UPDATE public.people_linkedin
  SET updated_at = now()
  WHERE id = p_people_linkedin_id;
END;
$$;

CREATE FUNCTION public.replace_education_history(
  p_people_linkedin_id uuid,
  p_user_id uuid,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.people_education_history
  WHERE people_linkedin_id = p_people_linkedin_id
    AND user_id = p_user_id;

  INSERT INTO public.people_education_history (
    user_id,
    people_linkedin_id,
    school_name,
    school_linkedin_id,
    degree,
    description,
    start_date,
    end_date
  )
  SELECT
    p_user_id,
    p_people_linkedin_id,
    (row_data ->> 'school_name')::text,
    (row_data ->> 'school_linkedin_id')::text,
    (row_data ->> 'degree')::text,
    (row_data ->> 'description')::text,
    (row_data ->> 'start_date')::date,
    (row_data ->> 'end_date')::date
  FROM jsonb_array_elements(p_rows) AS row_data;

  -- Touch the parent's updated_at timestamp
  UPDATE public.people_linkedin
  SET updated_at = now()
  WHERE id = p_people_linkedin_id;
END;
$$;
