-- Add subscriptions table for Polar.sh payment integration.
--
-- Stores the mapping between Bondery users and their Polar subscription state.
-- Only the webhook handler (service role) can INSERT/UPDATE/DELETE — users can
-- only SELECT their own row via RLS.

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  polar_customer_id text NOT NULL,
  polar_subscription_id text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'revoked', 'past_due')),
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id),
  CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Fast lookup by Polar customer ID (used by webhook handler)
CREATE INDEX subscriptions_polar_customer_id_idx
  ON public.subscriptions (polar_customer_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription.
-- No INSERT/UPDATE/DELETE policies for authenticated users — only the service
-- role (webhook handler) modifies subscription rows, bypassing RLS.
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
