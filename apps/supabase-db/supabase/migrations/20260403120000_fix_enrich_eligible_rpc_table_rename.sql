-- Fix get_linkedin_enrich_eligible RPC after people_social_media was renamed to people_socials.
--
-- The RPC was created on 20260312 referencing people_social_media, but that table was
-- renamed to people_socials on 20260323. This migration recreates the function pointing
-- at the correct table so the enrich eligible-count and batch-init endpoints work again.

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
    ps.person_id,
    ps.handle,
    p.first_name,
    p.last_name
  FROM people_socials ps
  JOIN people p
    ON p.id = ps.person_id
    AND p.user_id = ps.user_id
  LEFT JOIN people_linkedin pl
    ON pl.person_id = ps.person_id
    AND pl.user_id = ps.user_id
  WHERE ps.user_id = p_user_id
    AND ps.platform = 'linkedin'
    AND ps.handle IS NOT NULL
    AND pl.person_id IS NULL
  ORDER BY p.created_at
  LIMIT p_limit;
END;
$$;
