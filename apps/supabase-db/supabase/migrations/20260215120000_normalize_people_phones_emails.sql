-- Normalize contact phones and emails into dedicated tables
-- Backfills existing JSON array values from people.phones and people.emails

CREATE TABLE IF NOT EXISTS public.people_phones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  prefix text NOT NULL DEFAULT '+1',
  value text NOT NULL,
  type text NOT NULL DEFAULT 'home',
  preferred boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_phones_pkey PRIMARY KEY (id),
  CONSTRAINT people_phones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_phones_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_phones_type_check CHECK (type IN ('home', 'work')),
  CONSTRAINT people_phones_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT people_phones_value_nonempty_check CHECK (length(trim(value)) > 0)
);

CREATE TABLE IF NOT EXISTS public.people_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  value text NOT NULL,
  type text NOT NULL DEFAULT 'home',
  preferred boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_emails_pkey PRIMARY KEY (id),
  CONSTRAINT people_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_emails_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_emails_type_check CHECK (type IN ('home', 'work')),
  CONSTRAINT people_emails_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT people_emails_value_nonempty_check CHECK (length(trim(value)) > 0)
);

CREATE INDEX IF NOT EXISTS people_phones_user_id_idx
  ON public.people_phones(user_id);

CREATE INDEX IF NOT EXISTS people_phones_person_id_idx
  ON public.people_phones(person_id);

CREATE INDEX IF NOT EXISTS people_phones_person_sort_idx
  ON public.people_phones(person_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS people_emails_user_id_idx
  ON public.people_emails(user_id);

CREATE INDEX IF NOT EXISTS people_emails_person_id_idx
  ON public.people_emails(person_id);

CREATE INDEX IF NOT EXISTS people_emails_person_sort_idx
  ON public.people_emails(person_id, sort_order, created_at);

ALTER TABLE public.people_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people phones"
  ON public.people_phones
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people phones"
  ON public.people_phones
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

CREATE POLICY "Users can update their own people phones"
  ON public.people_phones
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

CREATE POLICY "Users can delete their own people phones"
  ON public.people_phones
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own people emails"
  ON public.people_emails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people emails"
  ON public.people_emails
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

CREATE POLICY "Users can update their own people emails"
  ON public.people_emails
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

CREATE POLICY "Users can delete their own people emails"
  ON public.people_emails
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER people_phones_updated_at
  BEFORE UPDATE ON public.people_phones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER people_emails_updated_at
  BEFORE UPDATE ON public.people_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

WITH expanded_phones AS (
  SELECT
    p.user_id,
    p.id AS person_id,
    phone_item,
    ordinality - 1 AS sort_order
  FROM public.people p,
    jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.phones) = 'array' THEN p.phones
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS entry(phone_item, ordinality)
), normalized_phones AS (
  SELECT
    e.user_id,
    e.person_id,
    COALESCE(NULLIF(trim(e.phone_item->>'prefix'), ''), '+1') AS prefix,
    NULLIF(trim(e.phone_item->>'value'), '') AS value,
    CASE
      WHEN lower(trim(COALESCE(e.phone_item->>'type', ''))) = 'work' THEN 'work'
      ELSE 'home'
    END AS type,
    CASE
      WHEN lower(trim(COALESCE(e.phone_item->>'preferred', 'false'))) = 'true' THEN true
      ELSE false
    END AS preferred,
    GREATEST(e.sort_order, 0) AS sort_order
  FROM expanded_phones e
)
INSERT INTO public.people_phones (user_id, person_id, prefix, value, type, preferred, sort_order)
SELECT
  n.user_id,
  n.person_id,
  n.prefix,
  n.value,
  n.type,
  n.preferred,
  n.sort_order
FROM normalized_phones n
WHERE n.value IS NOT NULL;

WITH expanded_emails AS (
  SELECT
    p.user_id,
    p.id AS person_id,
    email_item,
    ordinality - 1 AS sort_order
  FROM public.people p,
    jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p.emails) = 'array' THEN p.emails
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS entry(email_item, ordinality)
), normalized_emails AS (
  SELECT
    e.user_id,
    e.person_id,
    NULLIF(trim(e.email_item->>'value'), '') AS value,
    CASE
      WHEN lower(trim(COALESCE(e.email_item->>'type', ''))) = 'work' THEN 'work'
      ELSE 'home'
    END AS type,
    CASE
      WHEN lower(trim(COALESCE(e.email_item->>'preferred', 'false'))) = 'true' THEN true
      ELSE false
    END AS preferred,
    GREATEST(e.sort_order, 0) AS sort_order
  FROM expanded_emails e
)
INSERT INTO public.people_emails (user_id, person_id, value, type, preferred, sort_order)
SELECT
  n.user_id,
  n.person_id,
  n.value,
  n.type,
  n.preferred,
  n.sort_order
FROM normalized_emails n
WHERE n.value IS NOT NULL;

ALTER TABLE public.people
  DROP COLUMN IF EXISTS phones,
  DROP COLUMN IF EXISTS emails;
