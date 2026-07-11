-- Efficient overdue count for keep-in-touch shell badge (avoids loading full contact list).

CREATE OR REPLACE FUNCTION public.get_keep_in_touch_overdue_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.people
  WHERE user_id = p_user_id
    AND myself = false
    AND keep_frequency_days IS NOT NULL
    AND (
      last_interaction IS NULL
      OR last_interaction + (keep_frequency_days * interval '1 day') <= now()
    );
$$;
