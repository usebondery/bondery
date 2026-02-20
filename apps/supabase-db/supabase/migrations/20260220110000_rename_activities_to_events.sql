-- Rename activity domain tables and database objects to event terminology.

ALTER TABLE IF EXISTS public.activity_participants
  RENAME TO event_participants;

ALTER TABLE IF EXISTS public.activities
  RENAME TO events;

ALTER TABLE IF EXISTS public.event_participants
  RENAME COLUMN activity_id TO event_id;

ALTER INDEX IF EXISTS public.activities_user_id_idx
  RENAME TO events_user_id_idx;

ALTER INDEX IF EXISTS public.activities_date_idx
  RENAME TO events_date_idx;

ALTER INDEX IF EXISTS public.activity_participants_activity_id_idx
  RENAME TO event_participants_event_id_idx;

ALTER INDEX IF EXISTS public.activity_participants_person_id_idx
  RENAME TO event_participants_person_id_idx;

ALTER TABLE IF EXISTS public.events
  RENAME CONSTRAINT activities_pkey TO events_pkey;

ALTER TABLE IF EXISTS public.event_participants
  RENAME CONSTRAINT activity_participants_pkey TO event_participants_pkey;

ALTER TABLE IF EXISTS public.event_participants
  RENAME CONSTRAINT activity_participants_activity_id_fkey TO event_participants_event_id_fkey;

ALTER TABLE IF EXISTS public.event_participants
  RENAME CONSTRAINT activity_participants_person_id_fkey TO event_participants_person_id_fkey;

ALTER POLICY "Users can view and manage their own activities"
  ON public.events
  RENAME TO "Users can view and manage their own events";

ALTER POLICY "Users can view and manage participants of their activities"
  ON public.event_participants
  RENAME TO "Users can view and manage participants of their events";

ALTER TRIGGER activities_updated_at ON public.events
  RENAME TO events_updated_at;
