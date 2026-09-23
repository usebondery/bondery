# Rate limiting

Config: `apps/api/src/lib/platform/rate-limit.ts`. Redis required in all environments (`BONDERY_PRIVATE_REDIS_URL`).

## Key resolution

Requests are keyed in priority order:

1. `apikey:{id}` — authenticated API key
2. `user:{id}` — authenticated user session
3. `ip:{ip}` — anonymous / unauthenticated

`OPTIONS` requests are allowlisted (no limit).

## Bondery implementation

### Global default (all routes)

| Setting | Value |
|---------|-------|
| **max** | 300 requests |
| **timeWindow** | 60 seconds |

### Per-route tiers

| Tier | max | window | Routes |
|------|-----|--------|--------|
| `AI_TIER` | 20 | 60s | `POST /chat` |
| `ENRICH_TIER` | 100 | 10 min | Contact enrich, LinkedIn data |
| `GEOCODE_TIER` | 120 | 60s | `GET /geocode/suggest`, `/geocode/timezone` |
| `EXPORT_TIER` | 5 | 10 min | `GET /me/export`, `GET /me/export/summary`, `POST /me/import` |
| `IMPORT_TIER` | 80 | 10 min | Import commit (`ceil(2000/25)` from `@bondery/schemas/constants`) |
| `HEALTH_TIER` | 5 | 1 min | `GET /health/ready` |
| `NOT_FOUND_TIER` | 60 | 60s | 404 handler only |

Override via `config: { rateLimit: TIER }` on route options.

### Rate limit disabled (`rateLimit: false`)

- `GET /health/live`
- `GET /extension/manifest`
- `GET /sync/ws`, `GET /sync/ws-ticket`
- `POST /webhooks/stripe`

## 429 response

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "type": "rate_limit_error",
    "message": "Rate limit exceeded. Retry in 60 seconds.",
    "retry_after": 60
  }
}
```

## Industry reference tiers (not Bondery defaults)

Use these for judgment when designing new public or partner-facing endpoints — Bondery does not implement these tiers today:

| Tier | Limit | Window | Use case |
|------|-------|--------|----------|
| Anonymous | 30/min | Per IP | Public endpoints |
| Authenticated | 100/min | Per user | Standard API access |
| Premium | 1000/min | Per API key | Paid API plans |
| Internal | 10000/min | Per service | Service-to-service |

## Checklist

- [ ] New expensive route has an appropriate tier override (not just global 300/min)
- [ ] Health/status/webhook routes explicitly exempted if needed
- [ ] 429 uses `rate_limit_exceeded` catalog code with `retry_after`
- [ ] Production has Redis configured for distributed rate limiting
