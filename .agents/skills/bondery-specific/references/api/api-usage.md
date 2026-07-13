# API usage — transport wrappers

**Rule: one obvious way to call the Bondery API per runtime.** Every client (webapp, mobile, chrome extension, future clients) routes HTTP through a small transport layer — never scattered raw `fetch` calls with duplicated auth and error parsing.

This mirrors how Stripe SDKs work: a thin HTTP client (`StripeClient`) plus optional resource modules (`customers.create()`). The transport is separate from domain helpers.

---

## Architecture by client

| Client | Runtime | Transport | Base URL | Auth |
|--------|---------|-----------|----------|------|
| **Webapp (browser)** | Client component | `clientApiFetch` / `clientApiJson` / `clientApiJsonOrNull` | Same-origin `/api/*` (BFF) | BFF injects Bearer |
| **Webapp (server)** | RSC, loaders, route handlers | `serverApiFetch` / `serverApiJson` / `serverApiJsonOrNull` | `API_URL` + path | `resolveServerSession()` → Bearer |
| **Mobile** | React Native | `apiRequest()` via `mobileFetch()` | `EXPO_PUBLIC_API_URL` + path | Supabase session Bearer |
| **Chrome extension** | Service worker / popup | `authenticatedFetch()` | `config.apiUrl` + path | OAuth access token + `X-Bondery-Extension-Version` |

**Webapp BFF:** Browser calls `/api/contacts`; Next.js route handler validates the session and proxies to Fastify with Bearer. The browser never calls `API_URL` for authenticated resources.

**Webapp server session:** Route guards and server transport share `resolveServerSession()` (`lib/auth/resolveServerSession.ts`) — one cached `getUser()` + access token per request. Layout, BFF, `serverApiFetch`, and `getAppSession` all read from it. Do not call `supabase.auth.getUser()` directly in server code for auth gates.

**Status probe (webapp):** The webapp exposes `GET /api/status` as a BFF route (`app/api/status/route.ts`) that proxies to Fastify `/status` with normal auth headers. Browser code calls `clientApiFetch("/api/status")` — same as other BFF routes. The chrome extension calls `${config.apiUrl}/status` directly (no webapp hop).

---

## Transport functions

### Throw-on-error JSON (`*Json`)

Use when the caller **must** know success vs failure — mutations, form submits, detail views that show errors.

| Client | Function |
|--------|----------|
| Webapp browser | `clientApiJson<T>(path, init?)` |
| Webapp server | `serverApiJson<T>(path, init?, options?)` |
| Mobile | `apiRequest<T>(path, init?)` |

- Parses JSON on 2xx
- Throws on non-2xx (`ApiError` via `buildApiErrorFromResponse` on webapp and mobile)
- Re-throws `AbortError` (webapp `*JsonOrNull` only)

### Graceful-degradation JSON (`*JsonOrNull`)

Use when failure should **not** break UX — search-as-you-type, geocode suggestions, chip prefetch, optional banners.

| Client | Function | On failure |
|--------|----------|------------|
| Webapp browser | `clientApiJsonOrNull<T>` | Returns `null` |
| Webapp server | `serverApiJsonOrNull<T>` | Returns `null` |

**Do not** wrap `*JsonOrNull` in try/catch for expected failures — that is the point.

**When to pick which:** If the UI has no error state and an empty result is acceptable, use `*JsonOrNull`. If the user clicked Save or the screen depends on the data, use `*Json`.

A Stripe-style CTO would approve this split: it is the same distinction as "throw on payment failure" vs "return empty list when search index is unavailable." The alternative — one function with a `{ throwOnError: boolean }` flag — hides intent at call sites.

### Raw fetch (`*Fetch`)

Use when JSON helpers are insufficient:

- **FormData** uploads (do not set `Content-Type` manually)
- **Blob** downloads (vCard export)
- **Custom status handling** before throw (e.g. checkout 401/409)
- **Streaming** passthrough (chat BFF routes)

| Client | Function |
|--------|----------|
| Webapp browser | `clientApiFetch` |
| Webapp server | `serverApiFetch` |
| Mobile | `mobileFetch` (inside `apiRequest` for JSON) |
| Extension | `authenticatedFetch` |

---

## ApiError (`@bondery/helpers/api`)

Shared by webapp and mobile. All API HTTP errors use a nested envelope:

```json
{
  "error": {
    "type": "authentication_error",
    "code": "auth_required",
    "message": "Unauthorized - Please log in",
    "request_id": "…",
    "doc_url": "https://usebondery.com/docs/api/errors/auth_required"
  }
}
```

```typescript
import {
  ApiError,
  buildApiErrorFromResponse,
  getUserFacingError,
  isUnauthorizedApiError,
} from "@bondery/helpers/api";

class ApiError extends Error {
  status: number;
  code: string;              // machine-readable, e.g. auth_required
  type: ApiErrorType | null;
  developerMessage: string;  // server message (never shown directly in UI)
  param: string | null;
  docUrl: string | null;
  requestId: string | null;
  getUserMessage(t): string; // maps common.errors.api.{code}
}
```

**Why it exists:**

1. **One parser** — nested `{ error: { … } }` JSON is normalized in `@bondery/helpers/api`, not copied per client.
2. **Structured handling** — UI can branch on `error.status === 401` or `error.code === "auth_required"` instead of string-matching `"Unauthorized"`.
3. **Global policy** — `applyTransportErrorPolicy` in `clientApiJson` handles 401 and API-unavailable redirects in one place.

**Per-app transport** (not in helpers):

| Client | Parse/throw | Offline / network copy |
|--------|-------------|------------------------|
| Webapp | `parseResponse.ts` → `buildApiErrorFromResponse` | Browser `TypeError` via `isApiUnavailableError` |
| Mobile | `transport.ts` → `buildApiErrorFromResponse` | `resolveFetchFailureMessage` in `parseApiErrorBody.ts` |

Mobile `apiRequest` throws typed `ApiError` (same as webapp). UI shows `getUserFacingError(error, t)` with `t` from `useMobileTranslations()`.

---

## Failure handling — three layers (webapp)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **1 — Server bootstrap** | `lib/app/getAppSession.ts`, `app/(app)/app/layout.tsx` | Session probe + layout guards: unauthorized → login, unavailable → `/app/unavailable` |
| **2 — Classification** | `lib/api/availability.ts`, `lib/auth/unauthorized.ts` | `isApiUnavailableError`, `isUnauthorizedApiError` (no side effects) |
| **3 — Transport policy** | `applyTransportErrorPolicy.ts` + `client.ts`; `applyServerTransportPolicy.ts` + `server.ts` | Apply 401 / unavailable side effects per runtime |

**React Query** (`lib/query/client.ts`) owns cache config and retry rules only — not session or outage redirects.

### Session vs settings (webapp)

Layout loads **session** (who you are, shell + locale inputs, onboarding guard). Home and Settings load the full **settings** blob on demand via `useSettingsQuery()`. Never use `useSettingsQuery` for shell identity — use `useUserSession()` from `UserSessionProvider`. After identity-changing mutations, call `refreshAppShell()` so the layout re-probes session and guards stay aligned.

| Signal | Client action | Server action (RSC, `transportPolicy: true`) | Sign out? |
|--------|---------------|--------------------------------------------|-----------|
| 401 / `auth_required` | `endSession` → `/login?redirect=…` (`session_expired` only) | `handleServerUnauthorizedSession` → login with `redirect` | Yes |
| 502 / 503 / 504 / network `TypeError` | `handleApiUnavailable` → `/app/unavailable?redirect=…` | `redirect(/app/unavailable?redirect=…)` if session valid; else login | No |
| `*JsonOrNull` outage | Return `null` | Return `null` | No |
| `*JsonOrNull` 401 | Ends session | Signs out + redirects | Yes |
| BFF `app/api/**` | N/A | `bffProxyFetch` — passthrough status or nested 503 `service_unavailable` | Per status |

**Health probe:** `GET /api/health` (BFF → Fastify `/health`) for the unavailable page status panel. `GET /api/status` remains the liveness + extension version probe.

---

## Domain modules

### Webapp

Use the **domain → query hooks** stack — do not call `clientApiJson` / `serverApiJson` directly from feature components.

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Resources** | `lib/api/resources/*` | Path builders, response normalizers |
| **Domains** | `lib/api/domains/*`, `lib/api/domains/server/*` | Typed fetch wrappers per feature |
| **Query hooks** | `lib/query/hooks/*` | TanStack Query keys, mutations, invalidation |

See `apps/webapp/src/lib/api/README.md`. Transport stays in `lib/api/client.ts` and `lib/api/server.ts`.

BFF catch-all: `app/api/[[...path]]/route.ts`. Dedicated BFF routes bypass it: chat, health, status, sync ws-ticket.

### Mobile

Tier-1 CRM data is **local-first** — reads/writes go through `lib/domains/*` and `lib/sync/hooks/*` (SQLite + sync outbox), not REST. Tier-2/3 helpers live in `apps/mobile/src/lib/api/online-only.ts` and `client.ts`. See `apps/mobile/src/lib/README.md`.

### When to extract a shared helper (any client)

Extract when the same endpoint appears in **3+ places** or the call is non-trivial (FormData, custom errors). Domain modules are the default on webapp — not optional DRY.

---

## Mutations

See [api-mutations.md](./api-mutations.md): create/update endpoints return the full object; clients update local state from the response — no follow-up GET.

---

## Session teardown (webapp)

**Rule: one obvious way to end an authenticated client session.** Feature code must not call `supabase.auth.signOut()` or navigate to login directly. Use `endSession()` from `apps/webapp/src/lib/auth/endSession.ts`.

### When to use `endSession()`

| Trigger | `reason` | Supabase sign-out scope |
|---------|----------|-------------------------|
| Settings → Log out | `user_initiated` | global (revokes refresh tokens) |
| API 401 / `auth_required` | `session_expired` | `local` |
| Account deleted | `account_deleted` | `local` |

### What `endSession()` clears

In order, each step is best-effort (failures do not block later steps):

1. TanStack Query — `cancelQueries()` then `clear()`
2. `enrichBatchStore` — `resetState()`
3. Mantine notifications — default store and `statusNotificationsStore`
4. Mantine modals — `closeAll()`
5. Supabase session — `signOut()` per scope above
6. Hard navigation — `window.location.replace` to login (never `router.push`). On `session_expired` only, append `?redirect=` with captured pathname + search (`lib/auth/returnIntent.ts`). User-initiated sign-out and account deletion use bare `/login`.

### 401 handling

The **transport layer** detects expired sessions and delegates to session teardown:

- `clientApiJson` → `applyTransportErrorPolicy` → `handleUnauthorizedSession()` → `endSession({ reason: "session_expired" })` → `/login?redirect=…`
- `serverApiJson` / `serverApiFetch` (default) → `applyServerTransportPolicy` → `handleServerUnauthorizedSession()` → `signOutServerSession` + redirect login with `redirect`
- `clientApiJsonOrNull` / `serverApiJsonOrNull` → 401 on response status (same session teardown)
- Raw `clientApiFetch` callers → `applyTransportResponsePolicy(response)` when `!response.ok`
- BFF routes → passthrough 401 JSON; browser transport handles teardown

Do not handle 401 in feature components or React Query global handlers.

### API unavailable handling

When the BFF or upstream API is down (502/503/504 or fetch network failure):

- `clientApiJson` → `handleApiUnavailable()` → `/app/unavailable?redirect=…` (session stays active)
- `serverApiFetch` / `serverApiJson` (default) → `redirect(/app/unavailable?redirect=…)` when session valid; login when not
- `getAppSession()` with `transportPolicy: false` → layout redirects (probe, not sole gate)
- BFF routes → `bffProxyFetch` returns 503 JSON on network failure; browser client policy handles redirect
- `*JsonOrNull` does **not** redirect on unavailable — optional fetches degrade to `null`
- Recovery: unavailable page auto-navigates to `redirect` after health OK + `OUTAGE_RESUME_DELAY_MS` (see `references/ux/product/page-navigation-resume.md`)

Do not call `endSession()` for outage responses.

### What is not session teardown

Middleware and RSC layout redirects when there is **no user** (`proxy.ts`, `app/layout.tsx`) only block access — they run before the client app shell loads and do not call `endSession()`.

---

## Regression guards (webapp)

```bash
npm run check-api-fetch:strict   # part of webapp check-types
npm run check-api-fetch          # non-strict variant (webapp package.json)
```

- No `API_URL` import in `"use client"` files (except `lib/api/*`)
- No raw `fetch(API_ROUTES…)` in client components — use transport wrappers

---

## Out of scope for wrappers

- External URLs (Polar checkout iframe, Supabase, CDN assets)
- Scraping / third-party APIs (LinkedIn in extension content scripts)

---

## Reference implementations

| Concern | Path |
|---------|------|
| Webapp browser transport | `apps/webapp/src/lib/api/client.ts` |
| Webapp transport policy | `apps/webapp/src/lib/api/applyTransportErrorPolicy.ts` |
| Webapp server transport policy | `apps/webapp/src/lib/api/applyServerTransportPolicy.ts` |
| Webapp BFF proxy | `apps/webapp/src/lib/api/bffProxy.ts` |
| Webapp server bootstrap | `apps/webapp/src/lib/app/getAppSession.ts` |
| Webapp API unavailable redirect | `apps/webapp/src/lib/auth/handleApiUnavailable.ts` |
| Webapp return intent | `apps/webapp/src/lib/auth/returnIntent.ts` |
| Webapp server transport | `apps/webapp/src/lib/api/server.ts` |
| Webapp session teardown | `apps/webapp/src/lib/auth/endSession.ts` |
| Webapp 401 → session teardown | `apps/webapp/src/lib/auth/handleUnauthorizedSession.ts` |
| Mobile transport + helpers | `apps/mobile/src/lib/api/client.ts` |
| Extension transport | `apps/chrome-extension/src/lib/api/transport.ts` |
| Extension API domains | `apps/chrome-extension/src/lib/api/domains/` |
| Mutation response rule | `references/api/api-mutations.md` |
