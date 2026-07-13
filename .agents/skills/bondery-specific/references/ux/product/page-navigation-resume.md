# Page navigation & resume (return intent)

**Product-specific** — Bondery’s `redirect` param, outage recovery, and onboarding bypass for deep links.

For **generic** empty/loading patterns during outage, see [../common/empty-states.md](../common/empty-states.md) and [../common/loading-states.md](../common/loading-states.md).

---

## Problem

Users lose context when:

- Session expires mid-task → login
- API outage → `/app/unavailable`
- OAuth round-trip for deep links

**Goal:** Return to the **same screen and query string** after recovery — without `sessionStorage`, without login subtitle copy.

---

## Single mechanism: `redirect` query param

| Trigger | Destination |
|---------|-------------|
| Session expired (401) | `/login?redirect=<encoded-path>` |
| API unavailable | `/app/unavailable?redirect=<encoded-path>` |
| User sign-out / account delete | `/login` — **no** `redirect` |
| Chained outage → login | Forward existing `redirect`, not `/app/unavailable` |

**Helpers:** `apps/webapp/src/lib/auth/returnIntent.ts`

- `isSafeReturnPath` — same-origin `/app/*` paths; blocks `/login`, `/app/unavailable`, `/auth/*`; allows `/oauth/consent` (extension)
- `buildLoginUrl`, `buildUnavailableUrl`, `parseReturnIntent`, `captureReturnPath`, `getRequestReturnPath`

**Server capture:** `apps/webapp/src/proxy.ts` sets `x-pathname` + `x-search`; layout uses `getRequestReturnPath()`.

---

## Two redirect layers (do not confuse)

| Layer | When | Mechanism |
|-------|------|-----------|
| **Route auth** | No session visiting `/app/*` | `proxy.ts` → `supabase/proxy.ts` `updateSession` → `buildLoginUrl` |
| **API transport** | Valid session but API returns 401/503 | `applyTransportErrorPolicy` / `applyServerTransportPolicy` → `endSession` or unavailable redirect |

API 401 is **not** handled in `supabase/proxy.ts` — it runs in the client/server transport after the app shell is loaded.

---

## Outage recovery UX

1. User on deep screen → API fails → `/app/unavailable?redirect=…`
2. Recovery: **“Back online…”** (`UnavailableClient.tsx`)
3. Wait **`OUTAGE_RESUME_DELAY_MS`** (300ms) — `apps/webapp/src/lib/auth/constants.ts`
4. `router.replace(redirect)` or `/app`

**Unavailable empty state:** [../common/empty-states.md](../common/empty-states.md).

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
| Outage client | `handleApiUnavailable`, `applyTransportErrorPolicy` |
| Outage server | `app/(app)/app/layout.tsx` (`getAppSession`) |
| Recovery UI | `apps/webapp/src/app/(app)/app/unavailable/UnavailableClient.tsx` |
| OAuth | `apps/webapp/src/app/(app)/auth/callback/route.ts` |
| API policy | `apps/webapp/src/lib/api/README.md` |

---

## Do / Don’t

| Do | Don’t |
|----|-------|
| `redirect` only | `returnUrl` alias |
| Validate every consume path | Trust raw URLs |
| 300ms delay before auto-resume | Instant flash redirect |
| Skip onboarding once for deep links | Skip onboarding for `/app` home |
| Attach `redirect` only for `session_expired` | On voluntary sign-out |

---

## Manual QA

1. `/app/people/abc` → force 401 → login → sign in → same URL
2. Deep screen → outage → unavailable → recovery → same URL after delay
3. Unavailable → login → `redirect` is people URL, not unavailable
4. Sign out → login without `redirect`
5. OAuth deep link → skip onboarding once → land on target
6. Invalid `redirect` → `/app`

---

## Related

- [onboarding.md](./onboarding.md)
- [../common/ux-writing.md](../common/ux-writing.md)
- [../../api/api-usage.md](../../api/api-usage.md) — transport policy
