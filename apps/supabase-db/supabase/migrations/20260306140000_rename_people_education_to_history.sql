-- Rename people_education to people_education_history for naming consistency
-- with people_work_history.

ALTER TABLE public.people_education RENAME TO people_education_history;

-- Rename indexes
ALTER INDEX IF EXISTS people_education_user_id_idx RENAME TO people_education_history_user_id_idx;
ALTER INDEX IF EXISTS people_education_person_id_idx RENAME TO people_education_history_person_id_idx;

-- Rename trigger
ALTER TRIGGER people_education_updated_at ON public.people_education_history RENAME TO people_education_history_updated_at;

-- Rename policies
ALTER POLICY "Users can view their own people education" ON public.people_education_history RENAME TO "Users can view their own people education history";
ALTER POLICY "Users can insert their own people education" ON public.people_education_history RENAME TO "Users can insert their own people education history";
ALTER POLICY "Users can update their own people education" ON public.people_education_history RENAME TO "Users can update their own people education history";
ALTER POLICY "Users can delete their own people education" ON public.people_education_history RENAME TO "Users can delete their own people education history";
