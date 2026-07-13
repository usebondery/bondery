-- Efficient count for enrich-queue badge (avoids returning all eligible rows).

CREATE OR REPLACE FUNCTION public.get_linkedin_enrich_eligible_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
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
    AND pl.person_id IS NULL;
$$;
