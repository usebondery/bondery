# Env vars

| Variable | Purpose |
|----------|---------|
| `BONDERY_PRIVATE_STRIPE_SECRET_KEY` | Server Stripe API |
| `BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET` | Webhook signature |
| `BONDERY_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Embedded Checkout client |
| `BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY` | Monthly Price ID |
| `BONDERY_PUBLIC_STRIPE_PRICE_ID_ANNUAL` | Annual Price ID |
| `BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED` | `true` to enable upgrades (default `false`) |

Registered in `packages/helpers/src/env/manifest.ts`.

## Local webhook DX

Checkout, portal **open**, and first premium sync are outbound Stripe API calls — they work without inbound webhooks.

Portal cancel/resume, payment failure, trial-ending email, and `checkout.session.completed` need events forwarded to `POST /webhooks/stripe` on the API host (`http://127.0.0.1:26631/webhooks/stripe`).

| Script | When |
|--------|------|
| `pnpm run setup:stripe` | Once per machine (or `--force` after `stripe login` / secret drift). Writes the CLI `whsec_` into root `.env.local`, then `pnpm run env`. Restart the API afterwards. |
| `pnpm run dev:stripe` | Second terminal while the API is running. Long-lived `stripe listen`. |

Requires [Stripe CLI](https://docs.stripe.com/stripe-cli) on `PATH` and a prior `stripe login`. Neither script runs `stripe login`.

`BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET` is **not** `env:pull` / Infisical-syncable. Production and staging still store the Dashboard endpoint secret in Infisical; local listen uses a per-machine CLI secret. Shared test keys (`sk_test`, `pk_test`, price IDs) stay syncable.
