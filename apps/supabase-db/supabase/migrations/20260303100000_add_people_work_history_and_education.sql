-- Add work history and education tables for LinkedIn profile data.
-- Both tables store read-only data populated by LinkedIn import / enrichment.

-- ============================================================================
-- PEOPLE_WORK_HISTORY TABLE
-- ============================================================================

CREATE TABLE public.people_work_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  company_name text NOT NULL,
  company_linkedin_url text,
  company_logo_url text,
  title text,
  description text,
  start_date date,
  end_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_work_history_pkey PRIMARY KEY (id),
  CONSTRAINT people_work_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_work_history_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_work_history_company_name_nonempty CHECK (length(trim(company_name)) > 0),
  CONSTRAINT people_work_history_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT people_work_history_date_order_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX people_work_history_user_id_idx
  ON public.people_work_history(user_id);

CREATE INDEX people_work_history_person_id_idx
  ON public.people_work_history(person_id);

CREATE INDEX people_work_history_person_sort_idx
  ON public.people_work_history(person_id, sort_order, start_date DESC NULLS LAST);

ALTER TABLE public.people_work_history ENABLE ROW LEVEL SECURITY;

-- RLS: optimized with (select auth.uid()) to evaluate once per statement
CREATE POLICY "Users can view their own people work history"
  ON public.people_work_history
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own people work history"
  ON public.people_work_history
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own people work history"
  ON public.people_work_history
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own people work history"
  ON public.people_work_history
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER people_work_history_updated_at
  BEFORE UPDATE ON public.people_work_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- people_education TABLE
-- ============================================================================

CREATE TABLE public.people_education (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  school_name text NOT NULL,
  school_linkedin_url text,
  school_logo_url text,
  degree text,
  description text,
  start_date date,
  end_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_education_pkey PRIMARY KEY (id),
  CONSTRAINT people_education_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_education_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_education_school_name_nonempty CHECK (length(trim(school_name)) > 0),
  CONSTRAINT people_education_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT people_education_date_order_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX people_education_user_id_idx
  ON public.people_education(user_id);

CREATE INDEX people_education_person_id_idx
  ON public.people_education(person_id);

CREATE INDEX people_education_person_sort_idx
  ON public.people_education(person_id, sort_order, start_date DESC NULLS LAST);

ALTER TABLE public.people_education ENABLE ROW LEVEL SECURITY;

-- RLS: optimized with (select auth.uid()) to evaluate once per statement
CREATE POLICY "Users can view their own people education"
  ON public.people_education
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own people education"
  ON public.people_education
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own people education"
  ON public.people_education
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own people education"
  ON public.people_education
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER people_education_updated_at
  BEFORE UPDATE ON public.people_education
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
