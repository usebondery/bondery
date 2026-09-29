# API errors (Stripe-style)

Machine-readable API failures use a nested envelope:

```json
{
  "error": {
    "type": "not_found_error",
    "code": "contact_not_found",
    "message": "Contact not found",
    "request_id": "req_abc123",
    "doc_url": "https://usebondery.com/docs/api/errors/contact_not_found"
  }
}
```

Schema: `packages/schemas/src/errors/api-error-response/schema.ts`. Mapper: `apps/api/src/lib/platform/errors/to-api-error-response.ts` (`toApiErrorResponse`). REST Fastify mapping (`RequestValidationError`, sync conflict, 429) stays in `apps/api/src/lib/platform/errors/map-to-response.ts` and calls the shared builder for `DomainError` and generic 500s.

MCP tool failures and in-app chat tool failures use the same nested envelope. MCP HTTP auth/protocol errors (missing bearer, `invalid_token`, `insufficient_scope`) stay JSON-RPC.

## Catalog

- **Package:** `@bondery/schemas/errors` — `API_ERROR_CODES`, `getErrorDefinition`, `getErrorDocUrl`
- Codes are **snake_case** only — no ad-hoc string literals in production
- HTTP status per code: `packages/schemas/src/errors/api-error-codes.generated.ts`

## Server throw helpers

`apps/api/src/lib/platform/errors/http-errors.ts`:

| Helper | Status |
|--------|--------|
| `badRequest()` | 400 |
| `unauthorized()` | 401 |
| `forbidden()` | 403 |
| `notFound()` | 404 |
| `conflict()` | 409 |
| `internal()` | 500 |
| `serviceUnavailable()` | 503 |

Throw via helpers or `new DomainError(...)` with catalog codes. Never put internal details in `message` for 5xx — log server-side only.

**Special cases:**

- Validation (`RequestValidationError`) → 400, `code: "validation_error"`, optional `param`
- Sync conflict → 409, `code: "sync_conflict"`, `details.contact` with full contact
- Rate limit → 429, `code: "rate_limit_exceeded"`, `retry_after`

Standard error responses on routes: `standardErrorResponses` in `packages/schemas/src/http/responses.ts` (400, 401, 403, 404, 429, 500, 503).

## Before merge (new error code)

1. Catalog entry via `apps/api/scripts/generate-api-error-catalog.ts`
2. Docs page at `/docs/api/errors/{code}` on the website
3. `common.errors.api.{code}` in **en**, **cs**, **de**

## CI

- `check-route-errors` — inside `pnpm run check:types -w api`
- `pnpm run check:api-errors` — `check-api-errors-catalog`, `check-api-errors-translations`, `check-api-errors-client-display` (repo root)

## Client display

For showing errors in UI, see `bondery-ux` skill → [api-errors-display.md](../../bondery-ux/references/common/api-errors-display.md).

Clients import `@bondery/helpers/api` — `ApiError`, `buildApiErrorFromResponse`, `getUserFacingError`. App transport (`clientApiJson`, `apiRequest`) stays in each app.

## Checklist

- [ ] Code exists in generated catalog (`API_ERROR_CODES`)
- [ ] Thrown with correct HTTP helper / `DomainError` status
- [ ] Docs page and translations in all locales
- [ ] No raw server `message` shown in client notifications
