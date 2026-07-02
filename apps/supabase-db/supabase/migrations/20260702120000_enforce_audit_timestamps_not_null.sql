-- Enforce NOT NULL on audit timestamp columns.
-- Backfill any legacy nulls before adding constraints.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'people',
    'user_settings',
    'groups',
    'tags',
    'subscriptions',
    'chat_sessions',
    'api_keys'
  ]
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL',
      tbl
    );
    EXECUTE format(
      'UPDATE public.%I SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL',
      tbl
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN created_at SET NOT NULL',
      tbl
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN updated_at SET NOT NULL',
      tbl
    );
  END LOOP;
END $$;

-- Created-at-only tables (insert-only / immutable rows).
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'people_groups',
    'people_tags',
    'chat_messages'
  ]
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL',
      tbl
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN created_at SET NOT NULL',
      tbl
    );
  END LOOP;
END $$;
