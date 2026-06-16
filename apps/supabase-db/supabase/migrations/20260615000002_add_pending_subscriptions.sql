-- Pending subscriptions: store Polar subscription events that arrive before a
-- matching Bondery user account exists (e.g. user bought via Polar dashboard
-- before signing up to Bondery).
--
-- On sign-up, the auth trigger / sync endpoint claims any matching row and
-- upserts it into the main subscriptions table.
-- Rows older than 30 days are stale and should be purged by a cron job.

CREATE TABLE public.pending_subscriptions (
  email text NOT NULL PRIMARY KEY,
  polar_customer_id text NOT NULL,
  polar_subscription_id text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('active', 'canceling', 'canceled', 'revoked', 'past_due')),
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Only the service_role (webhook handler) can touch this table.
-- No RLS SELECT policy for regular users — email enumeration risk.
ALTER TABLE public.pending_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pending_subscriptions_updated_at
  BEFORE UPDATE ON public.pending_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
