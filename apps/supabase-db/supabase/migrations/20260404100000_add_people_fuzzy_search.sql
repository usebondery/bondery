-- Enable trigram matching for fuzzy / typo-tolerant people search.
-- Previously all name searches used ILIKE with leading wildcards, which forces
-- a full sequential scan and provides zero typo tolerance.
--
-- This migration:
--   1. Enables pg_trgm and unaccent extensions.
--   2. Creates an immutable unaccent wrapper (required for functional indexes).
--   3. Adds GIN trigram indexes on first_name and last_name separately.
--   4. Creates a search_people_ids RPC that returns ranked (id, rank) pairs
--      using word_similarity — supporting partial matches, typos, accented
--      characters, and last-name-only queries.

-- ── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── Immutable unaccent wrapper ───────────────────────────────────────────────
-- unaccent() is STABLE, not IMMUTABLE, so Postgres refuses to use it in
-- functional indexes. This thin wrapper is safe because the unaccent rules
-- dictionary never changes at runtime.

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = ''
AS $$ SELECT public.unaccent($1) $$;

-- ── GIN trigram indexes ──────────────────────────────────────────────────────
-- Separate indexes per column so the planner can bitmap-OR them when the
-- WHERE clause checks word_similarity against each column independently.

CREATE INDEX IF NOT EXISTS idx_people_first_name_trgm
  ON public.people
  USING GIN (public.immutable_unaccent(lower(first_name)) public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_people_last_name_trgm
  ON public.people
  USING GIN (public.immutable_unaccent(lower(last_name)) public.gin_trgm_ops);

-- ── Fuzzy search RPC ─────────────────────────────────────────────────────────
-- Returns TABLE(id UUID, rank FLOAT8) so the API layer can fetch full contact
-- rows via .in("id", ids) and preserve its existing CONTACT_SELECT aliasing.
--
-- Parameters:
--   p_user_id   – mandatory, scopes results to the authenticated user
--   p_query     – the search string typed by the user
--   p_limit     – max results (default 50)
--   p_offset    – pagination offset (default 0)
--   p_group_id  – optional; when set, restricts to members of this group
--   p_threshold – minimum word_similarity score (default 0.3)
--
-- The WHERE uses word_similarity on each indexed column separately so the
-- GIN indexes are used. The SELECT computes a richer 4-way GREATEST (each
-- column individually + combined full name in both orders) for ranking.

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
      public.word_similarity(q.normalized, public.immutable_unaccent(lower(p.first_name))),
      public.word_similarity(q.normalized, public.immutable_unaccent(lower(coalesce(p.last_name, '')))),
      public.word_similarity(q.normalized, public.immutable_unaccent(lower(
        p.first_name || ' ' || coalesce(p.last_name, '')
      ))),
      public.word_similarity(q.normalized, public.immutable_unaccent(lower(
        coalesce(p.last_name, '') || ' ' || p.first_name
      )))
    ) AS rank
  FROM public.people p, q
  WHERE p.user_id = p_user_id
    AND p.myself = FALSE
    AND (
      public.word_similarity(q.normalized, public.immutable_unaccent(lower(p.first_name))) > p_threshold
      OR public.word_similarity(q.normalized, public.immutable_unaccent(lower(coalesce(p.last_name, '')))) > p_threshold
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
