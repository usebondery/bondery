# Webapp API clients

Transport layer for HTTP. **Mutations and queries** go through `lib/api/domains/*` and `lib/query/hooks/*` — not raw `clientApiJson` in app components.

## Browser (`clientApi*`)

Import from `@/lib/api/client`. Always use same-origin paths from `API_ROUTES` (`/api/...`).

| Function | Use when |
|----------|----------|
| `clientApiJson<T>` | POST/PATCH/DELETE or GET where errors should throw |
| `clientApiJsonOrNull<T>` | Prefetch, search, chips — return `null` on failure |
| `clientApiFetch` | FormData uploads, blob downloads, custom status handling — call `applyTransportResponsePolicy` when `!response.ok` |

**Never** import `API_URL` in `"use client"` files.

## Transport policy (401 + API unavailable)

| Runtime | Policy module | On 401 | On outage |
|---------|---------------|--------|-----------|
| Browser | `applyTransportErrorPolicy` | `endSession` → `/login?redirect=…` (session expired only) | `handleApiUnavailable` → `/app/unavailable?redirect=…` |
| Server RSC | `applyServerTransportPolicy` | `signOutServerSession` → `/login?redirect=…` | `redirect(/app/unavailable?redirect=…)` if session valid, else login |

Return intent is captured as `pathname + search` in the `redirect` query param (see `lib/auth/returnIntent.ts`). Middleware forwards `x-pathname` and `x-search` for server-side capture. User-initiated sign-out does not set `redirect`.

`clientApiJson` and `serverApiFetch` (default) apply policy automatically. Unavailable redirects on the server are **session-gated** — no valid session routes to login, not unavailable (matches BFF 401-before-upstream on the client).

`serverApiJsonOrNull` / `clientApiJsonOrNull`: 401 ends session; outage returns `null`.

Raw `clientApiFetch` callers must call `applyTransportResponsePolicy(response)` on non-2xx.

## Server (`serverApi*`)

Import from `@/lib/api/server`. Used in RSC pages and loaders.

| Function | `transportPolicy` | Use when |
|----------|-------------------|----------|
| `serverApiFetch` / `serverApiJson` | default `true` | RSC data loads |
| `serverApiFetch` / `serverApiJson` | `false` | Routing probes (`probeMeSessionServer`) |
| `serverApiJsonOrNull` | always off for outage | Optional RSC prefetch |
| `bffProxyFetch` | N/A (imports from `@/lib/api/bffProxy`) | **`app/api/**` route handlers only** |

Auth: `serverApiFetch` attaches `Authorization: Bearer …` via `resolveServerSession()`. Route guards and BFF 401 gates use the same function — do not duplicate `getUser()` in server code.

`getAppSession()` delegates to `probeMeSessionServer()` for layout routing and shell identity. Full settings load via `useSettingsQuery` only on Home and Settings (prefetched in their loaders).

## Domain-first data access

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Resources** | `lib/api/resources/*` | Path + parse only — no `@/lib/api/client` or `server` |
| **Client domain** | `lib/api/domains/*` | Reads (via `clientApiJson`) + all writes |
| **Server domain** | `lib/api/domains/server/*` | Reads with `next.tags` (`import "server-only"`) |

Query hooks call client domains; RSC loaders call server domains or `lib/query/prefetch/*`.

See [`lib/query/README.md`](../query/README.md) for cache invalidation policy.

## Errors

Import shared error handling from `@bondery/helpers/api`:

- `buildApiErrorFromResponse` — used by `parseResponse.ts` when `!response.ok`
- `ApiError` — thrown by `clientApiJson` / `serverApiJson`; re-exported from `client.ts` / `server.ts`
- `getUserFacingError(error, t)` — use in UI notifications; pass `t` from `useCommonTranslations()`

API bodies use the nested `{ error: { type, code, message, request_id, doc_url } }` envelope. Never show server `message` in UI.

## Mutations

Follow [api-mutations.md](../../../.agents/skills/bondery-specific/references/api/api-mutations.md): use the object returned by create/update endpoints for **navigation only**; update UI via TanStack Query `invalidateQueries`.

## Regression checks

```bash
npm run check-api-fetch
```
