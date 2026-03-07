-- Drop sort_order column from people_work_history and people_education.
--
-- Rationale: sort_order captured LinkedIn's display order, but ordering is
-- now done at the API/query level by (end_date NULLS FIRST, start_date DESC)
-- which puts active jobs first and then orders by most recent start date.
-- The dedicated composite index is also dropped since the new ordering uses
-- end_date and start_date columns that are already covered by date indexes.

-- ============================================================================
-- PEOPLE_WORK_HISTORY
-- ============================================================================

DROP INDEX IF EXISTS public.people_work_history_person_sort_idx;
ALTER TABLE public.people_work_history DROP COLUMN IF EXISTS sort_order;

-- ============================================================================
-- people_education
-- ============================================================================

ALTER TABLE public.people_education DROP COLUMN IF EXISTS sort_order;
