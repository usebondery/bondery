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

## Response headers

Limited responses emit [draft-ietf-httpapi-ratelimit-headers-11](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-11).

This draft is not an RFC. RFC 9237 is a different document.

Do not set `enableDraftSpec`. That option emits `ratelimit-limit`, `ratelimit-remaining`, and `ratelimit-reset`.

`@fastify/rate-limit` remains the counter. The API also sends `x-ratelimit-*`.

Each limited response sends one policy. A route tier replaces the global policy.

```http
RateLimit-Policy: "default";q=300;w=60
RateLimit: "default";r=12;t=47
```

`q` is the quota. `w` is the window in whole seconds. `r` is the remaining requests. `t` is the seconds until reset.

An integrator reads `RateLimit` and `RateLimit-Policy` on each limited API response. On 429, the integrator reads `Retry-After`.

On 429, `r` is `0`. `Retry-After` equals `t`. The JSON field `error.retry_after` equals `t`.

`Retry-After` is present on 429 only.

The policy name matches the tier object. Names: `default`, `ai`, `enrich`, `geocode`, `export`, `import`, `health`, `mcp`, `csp_report`, `not_found`.

`csp_report` and `not_found` both use quota 60 and window 60. Use the tier object to choose the name.

If `x-ratelimit-limit` is absent, the API sends no `RateLimit` header. This covers `rateLimit: false`, `OPTIONS`, and a Redis skip.

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
- [ ] Limited responses emit `RateLimit` and `RateLimit-Policy`
- [ ] Production has Redis configured for distributed rate limiting
