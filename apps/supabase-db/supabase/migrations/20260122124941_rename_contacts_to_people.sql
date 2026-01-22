-- Rename contacts table to people
-- This migration renames the contacts table to better reflect the feature name

-- Rename the table
ALTER TABLE public.contacts RENAME TO people;

-- Rename the primary key constraint
ALTER TABLE public.people RENAME CONSTRAINT contacts_pkey TO people_pkey;

-- Rename the foreign key constraint
ALTER TABLE public.people RENAME CONSTRAINT contacts_user_id_fkey TO people_user_id_fkey;

-- Rename the indexes
ALTER INDEX public.contacts_user_id_idx RENAME TO people_user_id_idx;
ALTER INDEX public.contacts_last_interaction_idx RENAME TO people_last_interaction_idx;

-- Rename the trigger
ALTER TRIGGER contacts_updated_at ON public.people RENAME TO people_updated_at;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.people;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.people;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.people;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.people;

-- Create new RLS policies with updated names
CREATE POLICY "Users can view their own people"
  ON public.people
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people"
  ON public.people
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own people"
  ON public.people
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own people"
  ON public.people
  FOR DELETE
  USING (auth.uid() = user_id);
