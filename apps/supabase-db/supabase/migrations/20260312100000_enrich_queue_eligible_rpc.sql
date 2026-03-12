-- RPC function to find contacts eligible for LinkedIn enrichment.
--
-- A contact is eligible when it has a non-null LinkedIn handle in
-- people_social_media but no corresponding people_linkedin record yet.
--
-- This replaces the two-full-scan pattern used by the eligible-count
-- and batch-init endpoints with a single efficient join.

CREATE OR REPLACE FUNCTION public.get_linkedin_enrich_eligible(
  p_user_id uuid,
  p_limit int DEFAULT NULL
)
RETURNS TABLE (
  person_id uuid,
  handle text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    psm.person_id,
    psm.handle,
    p.first_name,
    p.last_name
  FROM people_social_media psm
  JOIN people p
    ON p.id = psm.person_id
    AND p.user_id = psm.user_id
  LEFT JOIN people_linkedin pl
    ON pl.person_id = psm.person_id
    AND pl.user_id = psm.user_id
  WHERE psm.user_id = p_user_id
    AND psm.platform = 'linkedin'
    AND psm.handle IS NOT NULL
    AND pl.person_id IS NULL
  ORDER BY p.created_at
  LIMIT p_limit;
END;
$$;
