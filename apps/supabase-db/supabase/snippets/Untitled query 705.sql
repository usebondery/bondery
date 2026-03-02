-- Rename timeline event domain tables and database objects to interaction terminology.

ALTER TABLE IF EXISTS public.event_participants
  RENAME TO interaction_participants;

ALTER TABLE IF EXISTS public.events
  RENAME TO interactions;

ALTER TABLE IF EXISTS public.interaction_participants
  RENAME COLUMN event_id TO interaction_id;

ALTER INDEX IF EXISTS public.events_user_id_idx
  RENAME TO interactions_user_id_idx;

ALTER INDEX IF EXISTS public.events_date_idx
  RENAME TO interactions_date_idx;

ALTER INDEX IF EXISTS public.event_participants_event_id_idx
  RENAME TO interaction_participants_interaction_id_idx;

ALTER INDEX IF EXISTS public.event_participants_person_id_idx
  RENAME TO interaction_participants_person_id_idx;

ALTER TABLE IF EXISTS public.interactions
  RENAME CONSTRAINT events_pkey TO interactions_pkey;

ALTER TABLE IF EXISTS public.interaction_participants
  RENAME CONSTRAINT event_participants_pkey TO interaction_participants_pkey;

ALTER TABLE IF EXISTS public.interaction_participants
  RENAME CONSTRAINT event_participants_event_id_fkey TO interaction_participants_interaction_id_fkey;

ALTER TABLE IF EXISTS public.interaction_participants
  RENAME CONSTRAINT event_participants_person_id_fkey TO interaction_participants_person_id_fkey;

ALTER POLICY "Users can view and manage their own events"
  ON public.interactions
  RENAME TO "Users can view and manage their own interactions";

ALTER POLICY "Users can view and manage participants of their events"
  ON public.interaction_participants
  RENAME TO "Users can view and manage participants of their interactions";

ALTER TRIGGER events_updated_at ON public.interactions
  RENAME TO interactions_updated_at;
