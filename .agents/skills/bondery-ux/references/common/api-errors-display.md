# API error display (client)

Show API failures using translated catalog copy — never raw server `message` strings in notifications.

## Helpers

Import from `@bondery/helpers/api`:

- `ApiError` — typed error with `code`, `type`, `doc_url`
- `buildApiErrorFromResponse` — parse nested `{ error: ... }` envelope
- `getUserFacingError(error, t)` — resolve translated copy for notifications

## Rules

- Use `getUserMessage(t)` or `getUserFacingError` for toast/notification text
- **Never** surface server `message` in user-facing notifications
- Error codes map to `common.errors.api.{code}` in **en**, **cs**, **de**

## Server catalog

For adding error codes, catalog entries, and CI requirements, see the `bondery-api` skill → [api-errors.md](../../../bondery-api/references/api-errors.md).

## Transport

App transport (`clientApiJson`, `serverApiJson`, `apiRequest`) stays in each app. See `bondery-api` → [api-usage.md](../../../bondery-api/references/api-usage.md) for 401/outage handling.

## Mobile surfaces

Resolve copy with `resolveDisplayedError` (`apps/mobile/src/lib/api/resolveDisplayedError.ts`). Never show server or SQLite `Error.message`.

| Situation | Surface | Copy |
|-----------|---------|------|
| Screen or section load failed after settle | `LoadErrorCard` / `AsyncLoadState` + Retry | `resolveDisplayedError` |
| User tapped Save / upload / share / settings persist | `useShowErrorToast` | same resolver; headline `common.feedback.errorTitle` unless the flow already has a feature title |
| Background sync HTTP or mutation `rejected` | `SyncErrorToasts` | same resolver |
| 401 / missing local session | `endLocalSession` only | no card, no toast (`resolveDisplayedError` returns `null`) |
| Auth ceremony (login, callback, passkey) | toast | `getAuthUserFacingError` |
| Local capability (photo permission, OS share, `tel:` / `mailto:`) | existing feature copy | not the API catalog |
| Missing contact on detail | `LoadErrorCard` without Retry | `errors.api.contact_not_found` |

Mutation toasts use `useShowErrorToast`. Do not add a global banner.

## Checklist

- [ ] Notifications use `getUserFacingError` (webapp) or `resolveDisplayedError` (mobile) — not `error.message`
- [ ] New error code has `common.errors.api.{code}` in all locales
- [ ] 401 triggers session teardown per api-usage transport policy
