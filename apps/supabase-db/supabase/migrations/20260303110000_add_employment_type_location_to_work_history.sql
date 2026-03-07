-- ============================================================================
-- Add employment_type and location columns to people_work_history
-- ============================================================================

ALTER TABLE public.people_work_history
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS location text;
