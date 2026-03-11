-- Add notes_updated_at column to track when notes were last modified
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS notes_updated_at timestamptz;

-- Function that sets notes_updated_at whenever the notes column changes
CREATE OR REPLACE FUNCTION public.set_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    NEW.notes_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update notes_updated_at on notes change
CREATE TRIGGER trg_set_notes_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notes_updated_at();
