# Webhook events

| Event | Handler action |
|-------|----------------|
| `checkout.session.completed` | Retrieve subscription, upsert mirror |
| `customer.subscription.created` | Upsert mirror |
| `customer.subscription.updated` | Upsert mirror |
| `customer.subscription.deleted` | Mark canceled |
| `invoice.paid` | Reset `payment_failure_count` |
| `invoice.payment_failed` | Set `payment_failure_count` from `attempt_count` |
| `customer.subscription.trial_will_end` | Send trial-ending email (once) |

Raw body verification: `stripe.webhooks.constructEvent`.

Local: `pnpm run setup:stripe` then `pnpm run dev:stripe` (forwards this event list to `http://127.0.0.1:26631/webhooks/stripe`). See [env-vars.md](./env-vars.md).
