-- Migration: Fix get_funnel_periods contacts definition and add get_total_users_growth RPC
--
-- get_funnel_periods: "contacts" now means users who signed up in the period
--   AND have at least 10 people records (activation milestone).
--
-- get_total_users_growth: returns cumulative user count per day for a
--   growth chart (DAY granularity, all time).

-- ── Fix get_funnel_periods ────────────────────────────────────────────────────

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
      (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ  AS end_at
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
      -- Signups: users who created their account within the period
      (
        SELECT COUNT(*)
        FROM auth.users u
        WHERE u.created_at >= p.start_at
          AND u.created_at < p.end_at
      ) AS signups,
      -- Contacts: users who signed up in the period AND have ≥10 people records
      -- (the activation milestone: they actually started building their network)
      (
        SELECT COUNT(*)
        FROM auth.users u
        WHERE u.created_at >= p.start_at
          AND u.created_at < p.end_at
          AND (
            SELECT COUNT(*)
            FROM public.people pe
            WHERE pe.user_id = u.id
          ) >= 10
      ) AS contacts,
      -- Interactions: interaction records created within the period
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
      CASE WHEN b.signups = 0 THEN 0
           ELSE (b.contacts::NUMERIC / b.signups::NUMERIC) * 100
      END,
      1
    ) AS signups_to_contacts_pct,
    ROUND(
      CASE WHEN b.contacts = 0 THEN 0
           ELSE (b.interactions::NUMERIC / b.contacts::NUMERIC) * 100
      END,
      1
    ) AS contacts_to_interactions_pct
  FROM base b
  ORDER BY CASE b.period_key
    WHEN 'last_14_days'     THEN 1
    WHEN 'days_14_to_28_ago' THEN 2
    WHEN 'last_30_days'     THEN 3
    ELSE 99
  END;
$$;

-- ── Add get_total_users_growth ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_total_users_growth()
RETURNS TABLE (
  date DATE,
  total BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    daily.date,
    SUM(daily.day_count) OVER (ORDER BY daily.date)::BIGINT AS total
  FROM (
    SELECT
      created_at::DATE AS date,
      COUNT(*) AS day_count
    FROM auth.users
    GROUP BY created_at::DATE
  ) daily
  ORDER BY daily.date;
$$;
