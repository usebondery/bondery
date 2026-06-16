-- RPC function: get_funnel_stats
-- Returns weekly funnel data for the KPIs dashboard (admin-only).
-- Counts signups (auth.users), contacts created (people), and interactions per week.
-- Uses SECURITY DEFINER to bypass RLS (called from service-role context only).

CREATE OR REPLACE FUNCTION public.get_funnel_stats(p_weeks INTEGER DEFAULT 12)
RETURNS TABLE (
  week         DATE,
  signups      BIGINT,
  contacts     BIGINT,
  interactions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
BEGIN
  v_start := date_trunc('week', CURRENT_DATE) - ((p_weeks - 1) * INTERVAL '1 week');

  RETURN QUERY
  WITH weeks AS (
    SELECT generate_series(
      v_start,
      date_trunc('week', CURRENT_DATE),
      '1 week'::INTERVAL
    )::DATE AS week_start
  ),
  weekly_signups AS (
    SELECT date_trunc('week', u.created_at)::DATE AS w, COUNT(*) AS cnt
    FROM auth.users u
    WHERE u.created_at >= v_start
    GROUP BY 1
  ),
  weekly_contacts AS (
    SELECT date_trunc('week', p.created_at)::DATE AS w, COUNT(*) AS cnt
    FROM public.people p
    WHERE p.created_at >= v_start::TIMESTAMPTZ
    GROUP BY 1
  ),
  weekly_interactions AS (
    SELECT date_trunc('week', i.created_at)::DATE AS w, COUNT(*) AS cnt
    FROM public.interactions i
    WHERE i.created_at >= v_start::TIMESTAMPTZ
    GROUP BY 1
  )
  SELECT
    ws.week_start                      AS week,
    COALESCE(s.cnt, 0)                 AS signups,
    COALESCE(c.cnt, 0)                 AS contacts,
    COALESCE(ix.cnt, 0)               AS interactions
  FROM weeks ws
  LEFT JOIN weekly_signups      s  ON s.w  = ws.week_start
  LEFT JOIN weekly_contacts     c  ON c.w  = ws.week_start
  LEFT JOIN weekly_interactions ix ON ix.w = ws.week_start
  ORDER BY ws.week_start;
END;
$$;
