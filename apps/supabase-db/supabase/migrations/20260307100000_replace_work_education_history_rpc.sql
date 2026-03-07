-- Atomic RPC functions for replacing work history and education history.
--
-- Wraps DELETE + INSERT inside a single transaction so if the insert fails
-- the old rows are preserved. Called from the POST /contacts/:id/enrich
-- API endpoint.

-- ============================================================================
-- replace_work_history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replace_work_history(
  p_person_id uuid,
  p_user_id uuid,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing rows for this person/user
  DELETE FROM public.people_work_history
  WHERE person_id = p_person_id
    AND user_id = p_user_id;

  -- Insert new rows from the JSONB array
  INSERT INTO public.people_work_history (
    user_id,
    person_id,
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
    p_person_id,
    (row_data ->> 'company_name')::text,
    (row_data ->> 'company_linkedin_id')::text,
    (row_data ->> 'title')::text,
    (row_data ->> 'description')::text,
    (row_data ->> 'start_date')::date,
    (row_data ->> 'end_date')::date,
    (row_data ->> 'employment_type')::text,
    (row_data ->> 'location')::text
  FROM jsonb_array_elements(p_rows) AS row_data;
END;
$$;

-- ============================================================================
-- replace_education_history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replace_education_history(
  p_person_id uuid,
  p_user_id uuid,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing rows for this person/user
  DELETE FROM public.people_education_history
  WHERE person_id = p_person_id
    AND user_id = p_user_id;

  -- Insert new rows from the JSONB array
  INSERT INTO public.people_education_history (
    user_id,
    person_id,
    school_name,
    school_linkedin_id,
    degree,
    description,
    start_date,
    end_date
  )
  SELECT
    p_user_id,
    p_person_id,
    (row_data ->> 'school_name')::text,
    (row_data ->> 'school_linkedin_id')::text,
    (row_data ->> 'degree')::text,
    (row_data ->> 'description')::text,
    (row_data ->> 'start_date')::date,
    (row_data ->> 'end_date')::date
  FROM jsonb_array_elements(p_rows) AS row_data;
END;
$$;
