# Architecture

Stripe Billing is integrated via custom Fastify routes and `apps/api/src/services/billing/*`.

See `docs/adr/0002-stripe-billing.mdx` for the decision to avoid the Better Auth Stripe plugin.

- **Mirror table:** `subscriptions` (webhook-maintained; `POST /subscriptions/sync` refreshes from Stripe when webhooks were missed, including portal cancel)
- **Pending checkout:** `pending_subscriptions` when no Bondery user exists yet
- **Idempotency:** `stripe_webhook_events`
