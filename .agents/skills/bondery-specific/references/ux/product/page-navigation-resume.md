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

- `isSafeReturnPath` — same-origin app paths only; blocks `/login`, `/app/unavailable`, `/auth/*`; allows `/oauth/consent` (extension)
- `buildLoginUrl`, `buildUnavailableUrl`, `parseReturnIntent`, `captureReturnPath`, `getRequestReturnPath`

**Server capture:** middleware sets `x-pathname` + `x-search`; layout uses `getRequestReturnPath()`.

---

## Outage recovery UX

1. User on deep screen → API fails → `/app/unavailable?redirect=…`
2. Recovery: **“Back online…”** (not “Redirecting…”)
3. Wait **`OUTAGE_RESUME_DELAY_MS`** (300ms) — `apps/webapp/src/lib/auth/constants.ts`
4. `router.replace(redirect)` or `/app`

**Unavailable empty state:** [../common/empty-states.md](../common/empty-states.md) — opportunity framing, primary “Try again”.

---

## Login & OAuth

- **No** contextual subtitle on login when `redirect` is present.
- After OAuth: `auth/callback` reads `redirect` from cookie → `isSafeReturnPath` → navigate.
- Default when missing/invalid: `/app`.

---

## Onboarding bypass (deep links)

One-time cookie `bondery_bypass_onboarding_once` when OAuth return target is a **safe deep link** (not `/app` home, not `/oauth/consent`).

- Short TTL (~2 min), `Secure`, `SameSite=Lax`
- `app/layout.tsx` reads cookie → skip onboarding gate once → clear cookie
- Rationale: power users / shared links should land on target, not wizard

Details: [onboarding.md](./onboarding.md).

---

## Implementation map

| Area | Location |
|------|----------|
| URL builders / validation | `lib/auth/returnIntent.ts` |
| Constants | `lib/auth/constants.ts` |
| 401 client | `handleServerUnauthorizedSession`, `endSession({ reason: 'session_expired' })` |
| 401 middleware | `supabase/proxy.ts` |
| Outage client | `handleApiUnavailable`, `applyServerTransportPolicy` |
| Outage server | `app/(app)/app/layout.tsx` |
| Recovery UI | `UnavailableClient.tsx` |
| OAuth | `auth/callback/route.ts` |
| API policy | `lib/api/README.md` |

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
- [../common/ux-writing.md](../common/ux-writing.md) — outage/login copy rules
- [../../api-usage.md](../../api-usage.md) — transport policy
