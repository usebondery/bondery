-- Move pg_trgm and unaccent extensions from public to extensions schema.
-- Having extensions in public is a security risk (OWASP / Supabase advisor
-- lint 0014_extension_in_public): a malicious public user could exploit
-- extension objects to escalate privileges.
--
-- This migration:
--   1. Drops dependent indexes and functions that use schema-qualified
--      names from these extensions (gin_trgm_ops, word_similarity, unaccent).
--   2. Moves both extensions to the extensions schema.
--   3. Recreates the immutable_unaccent wrapper pointing to extensions.unaccent.
--   4. Recreates the GIN trigram indexes using extensions.gin_trgm_ops.
--   5. Recreates the search_people_ids RPC using extensions.word_similarity.

-- ── Drop dependent objects ───────────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_people_first_name_trgm;
DROP INDEX IF EXISTS public.idx_people_last_name_trgm;

DROP FUNCTION IF EXISTS public.search_people_ids(UUID, TEXT, INT, INT, UUID, FLOAT8);
DROP FUNCTION IF EXISTS public.immutable_unaccent(text);

-- ── Move extensions ──────────────────────────────────────────────────────────

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- ── Immutable unaccent wrapper ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = ''
AS $$ SELECT extensions.unaccent($1) $$;

-- ── GIN trigram indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_people_first_name_trgm
  ON public.people
  USING GIN (public.immutable_unaccent(lower(first_name)) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_people_last_name_trgm
  ON public.people
  USING GIN (public.immutable_unaccent(lower(last_name)) extensions.gin_trgm_ops);

-- ── Fuzzy search RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_people_ids(
  p_user_id   UUID,
  p_query     TEXT,
  p_limit     INT     DEFAULT 50,
  p_offset    INT     DEFAULT 0,
  p_group_id  UUID    DEFAULT NULL,
  p_threshold FLOAT8  DEFAULT 0.3
)
RETURNS TABLE(id UUID, rank FLOAT8)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT public.immutable_unaccent(lower(p_query)) AS normalized
  )
  SELECT
    p.id,
    GREATEST(
      extensions.word_similarity(q.normalized, public.immutable_unaccent(lower(p.first_name))),
      extensions.word_similarity(q.normalized, public.immutable_unaccent(lower(coalesce(p.last_name, '')))),
      extensions.word_similarity(q.normalized, public.immutable_unaccent(lower(
        p.first_name || ' ' || coalesce(p.last_name, '')
      ))),
      extensions.word_similarity(q.normalized, public.immutable_unaccent(lower(
        coalesce(p.last_name, '') || ' ' || p.first_name
      )))
    ) AS rank
  FROM public.people p, q
  WHERE p.user_id = p_user_id
    AND p.myself = FALSE
    AND (
      extensions.word_similarity(q.normalized, public.immutable_unaccent(lower(p.first_name))) > p_threshold
      OR extensions.word_similarity(q.normalized, public.immutable_unaccent(lower(coalesce(p.last_name, '')))) > p_threshold
    )
    AND (
      p_group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.people_groups pg
        WHERE pg.person_id = p.id AND pg.group_id = p_group_id
      )
    )
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
