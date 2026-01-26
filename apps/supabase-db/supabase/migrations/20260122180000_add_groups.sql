-- Add groups feature
-- Creates groups table and people_groups join table for many-to-many relationship

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  emoji text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX groups_user_id_idx ON public.groups(user_id);

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own groups
CREATE POLICY "Users can view their own groups"
  ON public.groups
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own groups
CREATE POLICY "Users can insert their own groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own groups
CREATE POLICY "Users can update their own groups"
  ON public.groups
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own groups
CREATE POLICY "Users can delete their own groups"
  ON public.groups
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update groups.updated_at
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PEOPLE_GROUPS JOIN TABLE (many-to-many)
-- ============================================================================

CREATE TABLE public.people_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT people_groups_pkey PRIMARY KEY (id),
  CONSTRAINT people_groups_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT people_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_groups_unique UNIQUE (person_id, group_id)
);

-- Create indexes for faster queries
CREATE INDEX people_groups_person_id_idx ON public.people_groups(person_id);
CREATE INDEX people_groups_group_id_idx ON public.people_groups(group_id);
CREATE INDEX people_groups_user_id_idx ON public.people_groups(user_id);

-- Enable RLS on people_groups table
ALTER TABLE public.people_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own people_groups
CREATE POLICY "Users can view their own people_groups"
  ON public.people_groups
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own people_groups
CREATE POLICY "Users can insert their own people_groups"
  ON public.people_groups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own people_groups
CREATE POLICY "Users can update their own people_groups"
  ON public.people_groups
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own people_groups
CREATE POLICY "Users can delete their own people_groups"
  ON public.people_groups
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SAMPLE DATA QUERY (run manually to populate existing users)
-- ============================================================================
-- 
-- To create sample groups for a specific user and assign existing contacts:
--
-- -- Create sample groups
-- INSERT INTO public.groups (user_id, label, emoji, color) VALUES
--   ('YOUR_USER_ID', 'Family', '👨‍👩‍👧‍👦', '#FF6B6B'),
--   ('YOUR_USER_ID', 'Work', '💼', '#4ECDC4'),
--   ('YOUR_USER_ID', 'Friends', '🎉', '#45B7D1');
--
-- -- Assign people to groups (example: assign first 3 contacts to Family group)
-- INSERT INTO public.people_groups (person_id, group_id, user_id)
-- SELECT p.id, g.id, p.user_id
-- FROM public.people p
-- CROSS JOIN (SELECT id FROM public.groups WHERE label = 'Family' AND user_id = 'YOUR_USER_ID') g
-- WHERE p.user_id = 'YOUR_USER_ID'
-- LIMIT 3;
