-- Add normalized important events for contacts
-- Keeps birthday and other important dates in a single, query-friendly table

CREATE TABLE IF NOT EXISTS public.people_important_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  note text NULL,
  notify_days_before smallint NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_important_events_pkey PRIMARY KEY (id),
  CONSTRAINT people_important_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_important_events_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_important_events_type_check CHECK (
    event_type IN ('birthday', 'anniversary', 'nameday', 'graduation', 'other')
  ),
  CONSTRAINT people_important_events_notify_days_before_check CHECK (
    notify_days_before IS NULL OR notify_days_before IN (1, 3, 7)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS people_important_events_unique_birthday_idx
  ON public.people_important_events(user_id, person_id)
  WHERE event_type = 'birthday';

CREATE UNIQUE INDEX IF NOT EXISTS people_important_events_unique_event_idx
  ON public.people_important_events(
    user_id,
    person_id,
    event_type,
    event_date,
    COALESCE(note, '')
  );

CREATE INDEX IF NOT EXISTS people_important_events_user_id_idx
  ON public.people_important_events(user_id);

CREATE INDEX IF NOT EXISTS people_important_events_person_id_idx
  ON public.people_important_events(person_id);

CREATE INDEX IF NOT EXISTS people_important_events_event_date_idx
  ON public.people_important_events(event_date);

ALTER TABLE public.people_important_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people important events"
  ON public.people_important_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people important events"
  ON public.people_important_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own people important events"
  ON public.people_important_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own people important events"
  ON public.people_important_events
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER people_important_events_updated_at
  BEFORE UPDATE ON public.people_important_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Backfill birthday from legacy people.birthdate + people.notify_birthday
INSERT INTO public.people_important_events (
  user_id,
  person_id,
  event_type,
  event_date,
  note,
  notify_days_before
)
SELECT
  p.user_id,
  p.id,
  'birthday',
  (p.birthdate AT TIME ZONE 'UTC')::date,
  NULL,
  CASE WHEN p.notify_birthday IS TRUE THEN 1 ELSE NULL END
FROM public.people p
WHERE p.birthdate IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill legacy people.important_dates JSON
WITH expanded AS (
  SELECT
    p.user_id,
    p.id AS person_id,
    jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.important_dates) = 'array' THEN p.important_dates
        ELSE '[]'::jsonb
      END
    ) AS item
  FROM public.people p
),
normalized AS (
  SELECT
    e.user_id,
    e.person_id,
    CASE
      WHEN lower(trim(COALESCE(e.item->>'type', e.item->>'name', ''))) = 'birthday' THEN 'birthday'
      WHEN lower(trim(COALESCE(e.item->>'type', e.item->>'name', ''))) = 'anniversary' THEN 'anniversary'
      WHEN lower(trim(COALESCE(e.item->>'type', e.item->>'name', ''))) = 'nameday' THEN 'nameday'
      WHEN lower(trim(COALESCE(e.item->>'type', e.item->>'name', ''))) = 'graduation' THEN 'graduation'
      ELSE 'other'
    END AS event_type,
    CASE
      WHEN COALESCE(e.item->>'date', '') ~ '^\d{4}-\d{2}-\d{2}' THEN (e.item->>'date')::date
      ELSE NULL
    END AS event_date,
    NULLIF(trim(COALESCE(e.item->>'note', '')), '') AS note,
    CASE
      WHEN (e.item->>'notifyDaysBefore') IN ('1', '3', '7') THEN (e.item->>'notifyDaysBefore')::smallint
      WHEN (e.item->>'notify')::boolean IS TRUE THEN 1
      ELSE NULL
    END AS notify_days_before
  FROM expanded e
)
INSERT INTO public.people_important_events (
  user_id,
  person_id,
  event_type,
  event_date,
  note,
  notify_days_before
)
SELECT
  n.user_id,
  n.person_id,
  n.event_type,
  n.event_date,
  n.note,
  n.notify_days_before
FROM normalized n
WHERE n.event_date IS NOT NULL
ON CONFLICT DO NOTHING;
