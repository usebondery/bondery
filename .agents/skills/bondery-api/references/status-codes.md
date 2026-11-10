# HTTP status codes

Bondery uses semantic HTTP status codes. Do not return 200 for errors or use a `{ success: false }` body instead of proper status codes.

Mapper: `apps/api/src/lib/platform/errors/map-to-response.ts`. Throw helpers: `apps/api/src/lib/platform/errors/http-errors.ts`.

## Success

| Code | Use | Examples |
|------|-----|----------|
| **200 OK** | GET, PATCH, PUT, most success with body | Default for reads and updates |
| **201 Created** | POST that creates a resource | `POST /contacts`, `/groups`, `/tags`, `/interactions`, `/chat/sessions`, `/me/api-keys` — include full resource in body |
| **204 No Content** | Success with no body | `DELETE /me/api-keys/:id`, `DELETE /chat/sessions/:id`, `POST /me/initialize` |
| **302 Found** | Redirect | `GET /subscriptions/portal` → Stripe customer portal |

## Client errors

| Code | Use | Bondery helper / code |
|------|-----|----------------------|
| **400 Bad Request** | Validation failure, malformed JSON | `badRequest()`, `validation_error` |
| **401 Unauthorized** | Missing or invalid authentication | `unauthorized()` |
| **403 Forbidden** | Authenticated but not authorized | `forbidden()` |
| **404 Not Found** | Resource does not exist | `notFound()`, not-found handler → `not_found` |
| **409 Conflict** | Duplicate entry, state conflict | `conflict()`, `sync_conflict` |
| **426 Upgrade Required** | Client must upgrade | Extension version check, sync protocol mismatch |
| **429 Too Many Requests** | Rate limit exceeded | `rate_limit_exceeded` + `retry_after`. `Retry-After` equals `RateLimit` `t`. See [rate-limits.md](./rate-limits.md) |

## Server errors

| Code | Use | Bondery helper |
|------|-----|----------------|
| **500 Internal Server Error** | Unexpected failure | `internal()` — generic message to client; details logged server-side |
| **503 Service Unavailable** | Temporary overload or unhealthy dependency | `serviceUnavailable()`, `GET /health/ready` when unhealthy |

## Catalog status codes

From `packages/schemas/src/errors/api-error-codes.generated.ts`:

`400`, `401`, `403`, `404`, `409`, `426`, `429`, `500`, `503`

## Common mistakes

| Bad | Good |
|-----|------|
| `200` with `{ success: false, error: "Not found" }` | `404` with `{ error: { code: "not_found", ... } }` |
| `500` for validation errors | `400` with `validation_error` and field details |
| `200` for created resources | `201` with full resource body |
| Surfacing stack traces or SQL in `message` | Generic 5xx message; log details server-side |

## Error response shape

All API errors:

```json
{
  "error": {
    "code": "contact_not_found",
    "type": "not_found_error",
    "message": "...",
    "doc_url": "https://usebondery.com/docs/api/errors/contact_not_found",
    "request_id": "..."
  }
}
```

See [api-errors.md](./api-errors.md) for catalog and CI requirements.

## Checklist

- [ ] Status code matches operation semantics (201 for create, 204 for empty delete, etc.)
- [ ] Error body uses nested `error` envelope with catalog `code`
- [ ] 5xx responses do not leak internal details
- [ ] Route schema documents standard error responses via `standardErrorResponses`
