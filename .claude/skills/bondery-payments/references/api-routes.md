# API routes

| Route | Method | Notes |
|-------|--------|-------|
| `/api/subscriptions` | GET | DB-only status + quota |
| `/api/subscriptions/checkout` | POST | `{ interval }` → `{ clientSecret }` |
| `/api/subscriptions/portal` | GET | Redirect to Stripe billing portal |
| `/api/subscriptions/sync` | POST | Claim pending / refresh mirror from Stripe (incl. `cancelAtPeriodEnd`) |
| `/webhooks/stripe` | POST | Stripe webhooks on the API host (HMAC, no session). Dashboard URL: `https://api.usebondery.com/webhooks/stripe` |
