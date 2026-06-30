-- Count fuzzy-search matches for paginated people list endpoints.
-- Mirrors the WHERE clause of public.search_people_ids.

CREATE OR REPLACE FUNCTION public.count_search_people_ids(
  p_user_id        UUID,
  p_query          TEXT,
  p_group_id       UUID    DEFAULT NULL,
  p_tag_id         UUID    DEFAULT NULL,
  p_threshold      FLOAT8  DEFAULT 0.3,
  p_keep_in_touch  BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT public.immutable_unaccent(lower(p_query)) AS normalized
  )
  SELECT COUNT(*)::BIGINT
  FROM public.people p, q
  WHERE p.user_id = p_user_id
    AND p.myself = FALSE
    AND (NOT p_keep_in_touch OR p.keep_frequency_days IS NOT NULL)
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
    AND (
      p_tag_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.people_tags pt
        WHERE pt.person_id = p.id AND pt.tag_id = p_tag_id
      )
    );
$$;

-- Extend search_people_ids with optional keep-in-touch and tag filters.
CREATE OR REPLACE FUNCTION public.search_people_ids(
  p_user_id        UUID,
  p_query          TEXT,
  p_limit          INT     DEFAULT 50,
  p_offset         INT     DEFAULT 0,
  p_group_id       UUID    DEFAULT NULL,
  p_tag_id         UUID    DEFAULT NULL,
  p_threshold      FLOAT8  DEFAULT 0.3,
  p_keep_in_touch  BOOLEAN DEFAULT FALSE
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
    AND (NOT p_keep_in_touch OR p.keep_frequency_days IS NOT NULL)
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
    AND (
      p_tag_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.people_tags pt
        WHERE pt.person_id = p.id AND pt.tag_id = p_tag_id
      )
    )
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
