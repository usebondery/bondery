# Page navigation & resume (return intent)

**Product-specific** — Bondery’s `redirect` param, hop-down recovery, and onboarding bypass for deep links.

For **generic** empty/loading patterns during outage, see [../common/empty-states.md](../common/empty-states.md) and [../common/loading-states.md](../common/loading-states.md).

---

## Problem

Users lose context when:

- Session expires mid-task → login
- API hop fails mid-task → should stay on the same URL
- OAuth round-trip for deep links

**Goal:** Return to the **same screen and query string** after recovery — without `sessionStorage`, without login subtitle copy.

**Invariant:** The URL is the user's work. Only loss of identity may change it.

---

## Three layers (do not mix)

| Layer | What it owns | Hop-down / missing data |
|-------|----------------|-------------------------|
| **Identity** | Who you are (`getRequestSession`, app layout) | Anonymous → login. Hop-down **stays on the URL**. |
| **Shell chrome** | Sidebar, session name/avatar/theme, locale | Session-backed. **No** global outage banner, **no** `/health/ready` polling, **no** app-wide offline pill. |
| **Product data** | Page queries (settings, lists, detail) | Skeleton while pending with no cache, **stale** cache while refetching, `(shell)/error.tsx` + `QueryLoadError` Retry when the page-defining query fails with no data. Never fake defaults (`?? {}` / `?? []` as success) and never app-wide chrome. |

---

## Do not mix with `next_action`

`redirect` is **login return** only. A pending UI action on a product page uses `next_action` (`packages/helpers/src/globals/webapp-query.ts`). Names and values: [url-query-params.md](../../bondery-api/references/url-query-params.md).

## Single mechanism: `redirect` query param

| Trigger | Destination |
|---------|-------------|
| Session expired (401) | `/login?redirect=<encoded-path>` |
| User sign-out / account delete | `/login` — **no** `redirect` |
| Chained outage → login | Forward existing `redirect`, not `/app/unavailable` |

Hop failures (502/503/504, BFF synthetic 503, network errors) **do not** set `redirect` or change the URL. Product queries show skeleton, stale data, or `(shell)/error.tsx`.

**Helpers:** `apps/webapp/src/lib/auth/returnIntent.ts`

- `isSafeReturnPath` — same-origin `/app/*` paths; blocks `/login`, `/app/unavailable`, `/auth/*`; allows `/oauth/consent` (extension)
- `buildLoginUrl`, `parseReturnIntent`, `captureReturnPath`, `getRequestReturnPath`

**Server capture:** `apps/webapp/src/proxy.ts` sets `x-pathname` + `x-search`; layout uses `getRequestReturnPath()`.

---

## Two redirect layers (do not confuse)

| Layer | When | Mechanism |
|-------|------|-----------|
| **Route auth** | No session visiting `/app/*` | `proxy.ts` → `supabase/proxy.ts` `updateSession` → `buildLoginUrl` |
| **API transport** | Valid session but API returns 401 | `applyTransportErrorPolicy` / `applyServerTransportPolicy` → login with `redirect` |

API hop-down is **not** handled via URL change. Client transport classifies hop-down for query retries and otherwise stays silent. RSC transport rethrows into the route `error.tsx`.

---

## Hop-down recovery UX

1. User on a deep screen → hop failure → **URL stays**
2. That page’s query is skeleton (no cache), stale (has cache), or `(shell)/error.tsx` (`QueryLoadError`) when there is no cache
3. Retry on `error.tsx` calls `useQueryErrorResetBoundary().reset()` then Next `reset()` — not `/app/unavailable`, not a global banner. Cached pages keep rendering and refetch in place
4. 401 on a product request → login with `redirect`
5. Tab focus uses TanStack Query `refetchOnWindowFocus` (default `true`). Settings uses `refetchOnWindowFocus: false`. Do not invalidate-all on visibility.

`/app/unavailable` remains for stale bookmarks only; authenticated users are redirected to `/app` by layout. Nothing new navigates there. Bookmark Retry probes `GET /api/me/session` via `retryApiConnection()`.

---

## Login & OAuth

- **No** contextual subtitle on login when `redirect` is present.
- OAuth: `auth/callback/route.ts` reads safe `redirect` from query → navigates after session established.
- Default when missing/invalid: `/app`.

---

## Onboarding bypass (deep links)

When OAuth return target is a **safe deep link** (not `/app` home, not `/oauth/consent`):

- Cookie: `BYPASS_ONBOARDING_ONCE_COOKIE` = `bondery:bypassOnboardingOnce` (`constants.ts`)
- Set in callback: `maxAge: 60`, `path: /app`
- `app/(app)/app/layout.tsx` reads → skips onboarding gate once → clears cookie

Details: [onboarding.md](./onboarding.md).

---

## Implementation map

| Area | Location |
|------|----------|
| URL builders / validation | `apps/webapp/src/lib/auth/returnIntent.ts` |
| Constants | `apps/webapp/src/lib/auth/constants.ts` |
| Middleware headers | `apps/webapp/src/proxy.ts` |
| Unauthenticated route guard | `apps/webapp/src/supabase/proxy.ts` |
| 401 client transport | `handleUnauthorizedSession`, `endSession({ reason: 'session_expired' })` |
| 401 server transport | `handleServerUnauthorizedSession`, `applyServerTransportPolicy` |
| Hop-down client | `applyTransportErrorPolicy` (silent); page queries / `(shell)/error.tsx` + `QueryErrorResetBoundary` |
| Hop-down server | `applyServerTransportPolicy` (rethrow), `(shell)/error.tsx` |
| Identity layout | `getRequestSession`, `app/(app)/app/layout.tsx` |
| Stale bookmark page | `UnavailableClient.tsx` (`retryApiConnection` session probe only) |
| OAuth | `apps/webapp/src/app/(app)/auth/callback/route.ts` |
| API policy | `apps/webapp/src/lib/api/README.md` |

---

## Do / Don’t

| Do | Don’t |
|----|-------|
| `redirect` only for login | `returnUrl` alias, or `next_action` for login return |
| Validate every consume path | Trust raw URLs |
| Stay on URL during hop blips | Hard-nav to `/app/unavailable` on 503 |
| Skip onboarding once for deep links | Skip onboarding for `/app` home |
| Attach `redirect` only for `session_expired` | On voluntary sign-out |
| Show skeleton / stale / `(shell)/error.tsx` for product data | Global outage banner or fake `?? {}` success |
| Let `refetchOnWindowFocus` refresh queries | Invalidate-all on tab visibility or `router.refresh()` as a heartbeat |
| `refreshAppShell()` for onboarding / last-resort identity | `router.refresh()` after preference field saves |

---

## Manual QA

1. `/app/people/abc` → force 401 → login → sign in → same URL
2. Deep screen → kill API → URL stays; page shows skeleton or `(shell)/error.tsx` Retry — **no** global banner, **no** `/app/unavailable` — → API up → Retry (error.tsx reset) or focus refetch restores data
3. Cursor ↔ Chrome focus on Settings → no 307; settings query does not refetch on focus
4. Sign out → login without `redirect`
5. OAuth deep link → skip onboarding once → land on target
6. Invalid `redirect` → `/app`
7. Stale `/app/unavailable` bookmark while signed in → layout redirects home

---

## Related

- [onboarding.md](./onboarding.md)
- [../common/ux-writing.md](../common/ux-writing.md)
- [api-usage.md](../../../bondery-api/references/api-usage.md) — transport policy
