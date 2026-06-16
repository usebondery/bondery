-- Create the linkedin_enrich_queue table for batched LinkedIn enrichment.
--
-- The webapp creates pending entries; the extension processes them one-by-one
-- via the existing enrich flow. Status transitions:
--   pending → processing → completed | failed

CREATE TABLE public.linkedin_enrich_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT linkedin_enrich_queue_pkey PRIMARY KEY (id),
  CONSTRAINT linkedin_enrich_queue_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT linkedin_enrich_queue_person_id_fkey FOREIGN KEY (person_id)
    REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT linkedin_enrich_queue_user_person_unique UNIQUE (user_id, person_id),
  CONSTRAINT linkedin_enrich_queue_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  )
);

CREATE INDEX linkedin_enrich_queue_user_status_idx
  ON public.linkedin_enrich_queue(user_id, status);

ALTER TABLE public.linkedin_enrich_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrich queue"
  ON public.linkedin_enrich_queue
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own enrich queue"
  ON public.linkedin_enrich_queue
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = person_id
        AND p.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own enrich queue"
  ON public.linkedin_enrich_queue
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own enrich queue"
  ON public.linkedin_enrich_queue
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER linkedin_enrich_queue_updated_at
  BEFORE UPDATE ON public.linkedin_enrich_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
