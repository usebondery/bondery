-- RPC function: get_funnel_periods
-- Returns period-based funnel totals and conversion rates for KPI cards.
-- Uses SECURITY DEFINER to allow counting auth.users from service role.

CREATE OR REPLACE FUNCTION public.get_funnel_periods()
RETURNS TABLE (
  period_key TEXT,
  period_label TEXT,
  signups BIGINT,
  contacts BIGINT,
  interactions BIGINT,
  signups_to_contacts_pct NUMERIC,
  contacts_to_interactions_pct NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH periods AS (
    SELECT
      'last_14_days'::TEXT AS period_key,
      'Last 14 days'::TEXT AS period_label,
      (CURRENT_DATE - INTERVAL '13 day')::TIMESTAMPTZ AS start_at,
      (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ AS end_at
    UNION ALL
    SELECT
      'days_14_to_28_ago'::TEXT,
      '14-28 days ago'::TEXT,
      (CURRENT_DATE - INTERVAL '28 day')::TIMESTAMPTZ,
      (CURRENT_DATE - INTERVAL '13 day')::TIMESTAMPTZ
    UNION ALL
    SELECT
      'last_30_days'::TEXT,
      'Last 30 days'::TEXT,
      (CURRENT_DATE - INTERVAL '29 day')::TIMESTAMPTZ,
      (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
  ),
  base AS (
    SELECT
      p.period_key,
      p.period_label,
      (
        SELECT COUNT(*)
        FROM auth.users u
        WHERE u.created_at >= p.start_at
          AND u.created_at < p.end_at
      ) AS signups,
      (
        SELECT COUNT(*)
        FROM public.people pe
        WHERE pe.created_at >= p.start_at
          AND pe.created_at < p.end_at
      ) AS contacts,
      (
        SELECT COUNT(*)
        FROM public.interactions i
        WHERE i.created_at >= p.start_at
          AND i.created_at < p.end_at
      ) AS interactions
    FROM periods p
  )
  SELECT
    b.period_key,
    b.period_label,
    b.signups,
    b.contacts,
    b.interactions,
    ROUND(
      CASE WHEN b.signups = 0 THEN 0 ELSE (b.contacts::NUMERIC / b.signups::NUMERIC) * 100 END,
      1
    ) AS signups_to_contacts_pct,
    ROUND(
      CASE WHEN b.contacts = 0 THEN 0 ELSE (b.interactions::NUMERIC / b.contacts::NUMERIC) * 100 END,
      1
    ) AS contacts_to_interactions_pct
  FROM base b
  ORDER BY CASE b.period_key
    WHEN 'last_14_days' THEN 1
    WHEN 'days_14_to_28_ago' THEN 2
    WHEN 'last_30_days' THEN 3
    ELSE 99
  END;
$$;
