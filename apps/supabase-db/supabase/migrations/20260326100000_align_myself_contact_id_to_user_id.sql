-- ============================================================================
-- Align myself contact's people.id to match the user's UUID
-- ============================================================================
-- Problem: When the myself contact is created by handle_new_user() it gets a
-- random UUID for people.id.  The settings avatar is stored at
-- avatars/{user_id}/{user_id}.jpg, but the contact avatar path was
-- avatars/{user_id}/{people.id}.jpg — a different file. This migration:
--
--   1. Temporarily drops the foreign-key constraints from child tables that
--      reference people.id (they all have ON DELETE CASCADE, so the pattern
--      is drop + update + re-add).
--   2. Updates every myself contact's id to equal its user_id.
--   3. Cascades the change to every child table.
--   4. Re-adds the foreign-key constraints.
--   5. Updates handle_new_user() so future signups get people.id = user_id.
--
-- After this migration the resolveAvatarPersonId() workaround in the API can
-- be removed — the avatar path is simply avatars/{user_id}/{people.id}.jpg
-- for ALL contacts, which for myself contacts is avatars/{user_id}/{user_id}.jpg.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN

  -- -------------------------------------------------------------------------
  -- Step 1: Drop FK constraints on all child tables that reference people.id
  -- -------------------------------------------------------------------------
  -- We'll drop them, update, then re-add.  Order doesn't matter for drops.

  ALTER TABLE public.interaction_participants   DROP CONSTRAINT IF EXISTS interaction_participants_person_id_fkey;
  ALTER TABLE public.people_groups             DROP CONSTRAINT IF EXISTS people_groups_person_id_fkey;
  ALTER TABLE public.people_relationships      DROP CONSTRAINT IF EXISTS people_relationships_source_person_id_fkey;
  ALTER TABLE public.people_relationships      DROP CONSTRAINT IF EXISTS people_relationships_target_person_id_fkey;
  ALTER TABLE public.people_important_dates    DROP CONSTRAINT IF EXISTS people_important_events_person_id_fkey;
  ALTER TABLE public.people_phones             DROP CONSTRAINT IF EXISTS people_phones_person_id_fkey;
  ALTER TABLE public.people_emails             DROP CONSTRAINT IF EXISTS people_emails_person_id_fkey;
  ALTER TABLE public.people_socials            DROP CONSTRAINT IF EXISTS people_socials_person_id_fkey;
  ALTER TABLE public.people_addresses          DROP CONSTRAINT IF EXISTS people_addresses_person_id_fkey;
  ALTER TABLE public.people_linkedin           DROP CONSTRAINT IF EXISTS people_linkedin_person_id_fkey;
  ALTER TABLE public.people_tags               DROP CONSTRAINT IF EXISTS people_tags_person_id_fkey;
  ALTER TABLE public.people_merge_recommendations DROP CONSTRAINT IF EXISTS people_merge_recommendations_left_person_id_fkey;
  ALTER TABLE public.people_merge_recommendations DROP CONSTRAINT IF EXISTS people_merge_recommendations_right_person_id_fkey;
  ALTER TABLE public.linkedin_enrich_queue     DROP CONSTRAINT IF EXISTS linkedin_enrich_queue_person_id_fkey;

  -- -------------------------------------------------------------------------
  -- Step 2: For every myself contact whose id ≠ user_id, update child tables
  -- then update people.id
  -- -------------------------------------------------------------------------
  FOR r IN
    SELECT id AS old_id, user_id AS new_id
    FROM public.people
    WHERE myself = true
      AND id <> user_id
  LOOP
    -- Update child tables ---------------------------------------------------
    UPDATE public.interaction_participants   SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_groups              SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_relationships       SET source_person_id  = r.new_id WHERE source_person_id   = r.old_id;
    UPDATE public.people_relationships       SET target_person_id  = r.new_id WHERE target_person_id   = r.old_id;
    UPDATE public.people_important_dates     SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_phones              SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_emails              SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_socials             SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_addresses           SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_linkedin            SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_tags                SET person_id         = r.new_id WHERE person_id          = r.old_id;
    UPDATE public.people_merge_recommendations SET left_person_id  = r.new_id WHERE left_person_id    = r.old_id;
    UPDATE public.people_merge_recommendations SET right_person_id = r.new_id WHERE right_person_id   = r.old_id;
    UPDATE public.linkedin_enrich_queue      SET person_id         = r.new_id WHERE person_id         = r.old_id;

    -- Update the primary key ------------------------------------------------
    UPDATE public.people SET id = r.new_id WHERE id = r.old_id;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Step 3: Re-add FK constraints
  -- -------------------------------------------------------------------------
  ALTER TABLE public.interaction_participants
    ADD CONSTRAINT interaction_participants_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_groups
    ADD CONSTRAINT people_groups_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_relationships
    ADD CONSTRAINT people_relationships_source_person_id_fkey
    FOREIGN KEY (source_person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_relationships
    ADD CONSTRAINT people_relationships_target_person_id_fkey
    FOREIGN KEY (target_person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_important_dates
    ADD CONSTRAINT people_important_events_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_phones
    ADD CONSTRAINT people_phones_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_emails
    ADD CONSTRAINT people_emails_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_socials
    ADD CONSTRAINT people_socials_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_addresses
    ADD CONSTRAINT people_addresses_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_linkedin
    ADD CONSTRAINT people_linkedin_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_tags
    ADD CONSTRAINT people_tags_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_merge_recommendations
    ADD CONSTRAINT people_merge_recommendations_left_person_id_fkey
    FOREIGN KEY (left_person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.people_merge_recommendations
    ADD CONSTRAINT people_merge_recommendations_right_person_id_fkey
    FOREIGN KEY (right_person_id) REFERENCES public.people(id) ON DELETE CASCADE;

  ALTER TABLE public.linkedin_enrich_queue
    ADD CONSTRAINT linkedin_enrich_queue_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

END;
$$;

-- ============================================================================
-- Step 4: Update handle_new_user() so future signups set people.id = user_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  metadata_given_name text;
  metadata_family_name text;
  metadata_full_name text;
  resolved_name text;
  resolved_surname text;
  resolved_avatar_url text;
  resolved_timezone text;
  resolved_time_format text;
BEGIN
  metadata_given_name := NULLIF(BTRIM(COALESCE(metadata->>'given_name', '')), '');
  metadata_family_name := NULLIF(BTRIM(COALESCE(metadata->>'family_name', '')), '');
  metadata_full_name := NULLIF(
    BTRIM(COALESCE(metadata->>'name', metadata->>'full_name', '')),
    ''
  );

  resolved_name := metadata_given_name;
  resolved_surname := metadata_family_name;

  IF resolved_name IS NULL AND metadata_full_name IS NOT NULL THEN
    resolved_name := NULLIF(split_part(metadata_full_name, ' ', 1), '');
    resolved_surname := NULLIF(BTRIM(substring(metadata_full_name from length(split_part(metadata_full_name, ' ', 1)) + 1)), '');
  END IF;

  resolved_avatar_url := NULLIF(
    BTRIM(COALESCE(metadata->>'avatar_url', metadata->>'picture', '')),
    ''
  );

  -- Read timezone from metadata if available, validate against pg_timezone_names
  resolved_timezone := NULLIF(BTRIM(COALESCE(metadata->>'timezone', '')), '');
  IF resolved_timezone IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = resolved_timezone) THEN
      resolved_timezone := 'UTC';
    END IF;
  ELSE
    resolved_timezone := 'UTC';
  END IF;

  -- Read time format from metadata if available, validate against allowed values
  resolved_time_format := NULLIF(BTRIM(COALESCE(metadata->>'time_format', '')), '');
  IF resolved_time_format NOT IN ('12h', '24h') OR resolved_time_format IS NULL THEN
    resolved_time_format := '24h';
  END IF;

  INSERT INTO public.user_settings (
    user_id,
    name,
    middlename,
    surname,
    avatar_url,
    language,
    timezone,
    time_format,
    color_scheme
  )
  VALUES (
    NEW.id,
    resolved_name,
    '',
    resolved_surname,
    resolved_avatar_url,
    'en',
    resolved_timezone,
    resolved_time_format,
    'auto'
  );

  -- Create the "myself" contact with id = user_id so that the avatar path
  -- avatars/{user_id}/{person_id}.jpg is the same as the settings avatar path.
  INSERT INTO public.people (
    id,
    user_id,
    first_name,
    last_name,
    myself,
    last_interaction
  )
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(resolved_name, ''),
    resolved_surname,
    true,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
