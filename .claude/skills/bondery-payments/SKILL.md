---
name: bondery-payments
description: >
  Bondery Stripe Billing integration — embedded Checkout, webhook mirror, entitlements,
  trial-ending email, and env configuration. Use when changing subscriptions, checkout,
  billing webhooks, premium access, or Stripe Dashboard setup.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Payments (Stripe Billing)

## When to use

- Changing subscription routes, checkout, portal, or sync
- Handling Stripe webhooks or mirror table updates
- Premium access / payment failure grace logic
- Trial-ending email or billing env vars
- Migrating or reviewing billing architecture

## Non-negotiables

1. **Stripe is source of truth** — Price IDs in env; `subscriptions` is a webhook mirror.
2. **Custom Fastify integration** — not Better Auth Stripe plugin (see ADR 0002).
3. **Webhooks at `POST /webhooks/stripe` on the API host** (`https://api.usebondery.com/webhooks/stripe`) — raw body + `constructEvent` + idempotency table. Not the webapp `/api` BFF prefix.
4. **`GET /api/subscriptions` is DB-only** — no live Stripe API calls on read.
5. **Embedded Checkout** — `ui_mode: embedded`, return `clientSecret`, `@stripe/stripe-js`.
6. **Upgrades gated** — `BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED=false` by default.

## Decision tree

| Task | Read |
|------|------|
| Architecture & ADR | [references/architecture.md](references/architecture.md) |
| Webhook events | [references/webhook-events.md](references/webhook-events.md) |
| Stripe product model | [references/stripe-product-model.md](references/stripe-product-model.md) |
| Access control | [references/access-control.md](references/access-control.md) |
| Env vars / local Stripe CLI | [references/env-vars.md](references/env-vars.md) |
| API routes | [references/api-routes.md](references/api-routes.md) |
| Webapp checkout | [references/client-integration.md](references/client-integration.md) |
| Trial-ending email (billing trigger) | [references/trial-ending-email.md](references/trial-ending-email.md) — template/delivery → [bondery-emails](../bondery-emails/references/catalog.md) |

## Pre-ship checklist

- [ ] Webhook handler idempotent (`stripe_webhook_events`)
- [ ] `mapStripeStatus` and `hasPremiumAccess` consistent with webhook writes
- [ ] Checkout: `allow_promotion_codes`, 15-day trial, `metadata.bondery_user_id`
- [ ] No Polar references remain (`rg -i polar`)
- [ ] OpenAPI + schema package updated
- [ ] Legal subprocessor registry lists Stripe (not Polar)
