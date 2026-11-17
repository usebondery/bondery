# Access control

`hasPremiumAccess()` in `entitlements.ts`:

| Local status | `payment_failure_count` | Premium |
|--------------|-------------------------|---------|
| `active`, `canceling` | any | Yes |
| `past_due` | &lt; 3 | Yes (grace) |
| `past_due` | ≥ 3 | No (`paymentBlocked`) |
| `canceled`, other | any | No |

Used by `quota.ts` and `GET /api/subscriptions`.
