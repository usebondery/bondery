# API usage — transport wrappers

**Rule: one obvious way to call the Bondery API per runtime.** Every client (webapp, mobile, chrome extension, future clients) routes HTTP through a small transport layer — never scattered raw `fetch` calls with duplicated auth and error parsing.

This mirrors how Stripe SDKs work: a thin HTTP client (`StripeClient`) plus optional resource modules (`customers.create()`). The transport is separate from domain helpers.

---

## Architecture by client

| Client | Runtime | Transport | Base URL | Auth |
|--------|---------|-----------|----------|------|
| **Webapp (browser)** | Client component | `clientApiFetch` / `clientApiJson` / `clientApiJsonOrNull` | Same-origin `/api/*` (BFF) | BFF injects Bearer |
| **Webapp (server)** | RSC, loaders, route handlers | `serverApiFetch` / `serverApiJson` / `serverApiJsonOrNull` | `API_URL` + path | `getAuthHeaders()` |
| **Mobile** | React Native | `apiRequest()` via `mobileFetch()` | `EXPO_PUBLIC_API_URL` + path | Supabase session Bearer |
| **Chrome extension** | Service worker / popup | `authenticatedFetch()` | `config.apiUrl` + path | OAuth access token + `X-Bondery-Extension-Version` |

**Webapp BFF:** Browser calls `/api/contacts`; Next.js route handler validates the session and proxies to Fastify with Bearer. The browser never calls `API_URL` for authenticated resources.

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
- Throws on non-2xx (webapp: `ApiError`; mobile: `Error` with parsed message)
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

## ApiError (webapp)

```typescript
class ApiError extends Error {
  status: number;       // HTTP status, e.g. 401, 409
  code: string | null; // machine-readable, e.g. from { code: "BFF_UNAUTHORIZED" }
  message: string;     // human-readable from API body or fallback
}
```

**Why it exists:**

1. **One parser** — `{ error, message, code }` JSON, HTML 502 pages, and network failures are normalized in `parseApiError.ts`, not copied at 40 call sites.
2. **Structured handling** — UI can branch on `error.status === 401` or `error.code === "BFF_UNAUTHORIZED"` instead of string-matching `"Unauthorized"`.
3. **Future global handler** — a single toast or redirect-on-401 hook can catch `ApiError` in one place.

Mobile uses the same idea with `resolveApiErrorMessage()` + plain `Error`; webapp typed it as `ApiError` for instanceof checks.

---

## Domain modules

**Webapp:** Call transport wrappers directly in components and libs — no domain module layer. Use `clientApiJson` / `serverApiJson` with `API_ROUTES` at the call site.

**Mobile:** Resource helpers live in `apps/mobile/src/lib/api/client.ts` (`createContact`, `fetchContact`, …) — same transport underneath, grouped for RN reuse.

### When to extract a shared helper (any client)

Extract a function to a `lib/` module when the same endpoint appears in **3+ places** or the call is non-trivial (FormData, custom errors). That is a local DRY helper, not a required SDK layer.

```typescript
// Webapp — typical pattern at call site
await clientApiJson(`${API_ROUTES.CONTACTS}/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(input),
});
```

---

## Mutations

See [api-mutations.md](./api-mutations.md): create/update endpoints return the full object; clients update local state from the response — no follow-up GET.

---

## Regression guards (webapp)

```bash
npm run check-api-fetch:strict   # part of check-types
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
| Webapp server transport | `apps/webapp/src/lib/api/server.ts` |
| Webapp 401 session handler | `apps/webapp/src/lib/auth/handleUnauthorizedSession.ts` |
| Mobile transport + helpers | `apps/mobile/src/lib/api/client.ts` |
| Extension transport | `apps/chrome-extension/src/utils/api.ts` |
| Mutation response rule | `references/api-mutations.md` |
