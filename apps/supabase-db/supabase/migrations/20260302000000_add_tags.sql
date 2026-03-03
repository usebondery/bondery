-- Add tags feature
-- Creates tags table and people_tags join table for many-to-many relationship

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX tags_user_id_idx ON public.tags(user_id);

-- Enable RLS on tags table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own tags
CREATE POLICY "Users can view their own tags"
  ON public.tags
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own tags
CREATE POLICY "Users can insert their own tags"
  ON public.tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own tags
CREATE POLICY "Users can update their own tags"
  ON public.tags
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own tags
CREATE POLICY "Users can delete their own tags"
  ON public.tags
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update tags.updated_at
CREATE TRIGGER tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PEOPLE_TAGS JOIN TABLE (many-to-many)
-- ============================================================================

CREATE TABLE public.people_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT people_tags_pkey PRIMARY KEY (id),
  CONSTRAINT people_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE,
  CONSTRAINT people_tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_tags_unique UNIQUE (person_id, tag_id)
);

-- Create indexes for faster queries
CREATE INDEX people_tags_person_id_idx ON public.people_tags(person_id);
CREATE INDEX people_tags_tag_id_idx ON public.people_tags(tag_id);
CREATE INDEX people_tags_user_id_idx ON public.people_tags(user_id);

-- Enable RLS on people_tags table
ALTER TABLE public.people_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own people_tags
CREATE POLICY "Users can view their own people_tags"
  ON public.people_tags
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own people_tags
CREATE POLICY "Users can insert their own people_tags"
  ON public.people_tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own people_tags
CREATE POLICY "Users can update their own people_tags"
  ON public.people_tags
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own people_tags
CREATE POLICY "Users can delete their own people_tags"
  ON public.people_tags
  FOR DELETE
  USING (auth.uid() = user_id);
