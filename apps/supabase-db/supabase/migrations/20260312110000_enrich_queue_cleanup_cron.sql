-- Nightly cleanup of stale LinkedIn enrich queue rows.
--
-- When a user pauses an enrichment run and never resumes it, rows accumulate
-- indefinitely across all statuses (pending, processing, completed, failed).
-- This migration adds:
--
--   1. A partial index on updated_at for active statuses only, so the nightly
--      DELETE can seek stale users efficiently without scanning completed rows.
--
--   2. A SECURITY DEFINER function that deletes ALL queue rows for any user
--      who has had pending/processing rows sitting untouched for 7+ days.
--      Deleting all rows (not just pending) matches the behaviour of the
--      app-level DELETE /enrich-queue endpoint used on natural run completion
--      and manual discard.
--
--   3. A nightly pg_cron job at 02:30 UTC that calls the function.

-- ─── 1. Partial index ──────────────────────────────────────────────────────────

CREATE INDEX linkedin_enrich_queue_stale_cleanup_idx
  ON public.linkedin_enrich_queue(updated_at)
  WHERE status IN ('pending', 'processing');

-- ─── 2. Cleanup function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_stale_enrich_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Identify users whose active queue rows haven't been touched in 7 days,
  -- then delete the entire queue for those users (all statuses).
  -- The subquery hits only the partial index above; the outer DELETE is a
  -- targeted per-user cleanup matching what the app does on discard/completion.
  WITH stale_users AS (
    SELECT DISTINCT user_id
    FROM public.linkedin_enrich_queue
    WHERE status IN ('pending', 'processing')
      AND updated_at < now() - interval '7 days'
  ),
  deleted AS (
    DELETE FROM public.linkedin_enrich_queue
    WHERE user_id IN (SELECT user_id FROM stale_users)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- ─── 3. Schedule nightly cron job ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup-stale-enrich-queue'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-stale-enrich-queue',
      '30 2 * * *',
      $cron$SELECT public.cleanup_stale_enrich_queue();$cron$
    );
  END IF;
END;
$$;
