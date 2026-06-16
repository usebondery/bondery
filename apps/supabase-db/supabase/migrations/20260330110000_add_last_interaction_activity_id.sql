-- Add last_interaction_activity_id to people table
-- This FK links to the interaction that caused the last_interaction date to be set.
-- NULL means the last_interaction was set manually by the user (not via a logged interaction).
-- ON DELETE SET NULL ensures the hint disappears cleanly if the linked interaction is deleted.

ALTER TABLE public.people
  ADD COLUMN last_interaction_activity_id uuid
    REFERENCES public.interactions(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.people.last_interaction_activity_id IS
  'References the interaction that last updated last_interaction. NULL = manually set by user.';
