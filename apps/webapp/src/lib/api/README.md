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
| Browser | `applyTransportErrorPolicy` | `endSession` → login | `handleApiUnavailable` → `/app/unavailable` |
| Server RSC | `applyServerTransportPolicy` | `signOutServerSession` → login | `redirect(/app/unavailable)` if session valid, else login |

`clientApiJson` and `serverApiFetch` (default) apply policy automatically. Unavailable redirects on the server are **session-gated** — no valid session routes to login, not unavailable (matches BFF 401-before-upstream on the client).

`serverApiJsonOrNull` / `clientApiJsonOrNull`: 401 ends session; outage returns `null`.

Raw `clientApiFetch` callers must call `applyTransportResponsePolicy(response)` on non-2xx.

## Server (`serverApi*`)

Import from `@/lib/api/server`. Used in RSC pages and loaders.

| Function | `transportPolicy` | Use when |
|----------|-------------------|----------|
| `serverApiFetch` / `serverApiJson` | default `true` | RSC data loads |
| `serverApiFetch` / `serverApiJson` | `false` | Routing probes (`getAppBootstrap`) |
| `serverApiJsonOrNull` | always off for outage | Optional RSC prefetch |
| `bffProxyFetch` | N/A (imports from `@/lib/api/bffProxy`) | **`app/api/**` route handlers only** |

Auth: `serverApiFetch` attaches `Authorization: Bearer …` via `resolveServerSession()`. Route guards and BFF 401 gates use the same function — do not duplicate `getUser()` in server code.

Bootstrap (`getAppBootstrap`) **probes** API health; transport policy on every RSC fetch is the enforcement layer (layout is belt-and-suspenders).



## Domain modules (`lib/api/domains/`)

App components and query hooks call domain functions (`createContact`, `updateSettings`, etc.). Domains wrap `clientApi*` internally.

## Three-layer data access

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `lib/api/domains/*` | HTTP verbs, request bodies, typed responses — no React |
| **Fetchers** | `lib/query/fetchers/*` | Path builders, normalizers, `createXQueryFn` for TanStack Query |
| **Hooks** | `lib/query/hooks/*` | `useQuery` / `useMutation`, query keys, cache invalidation |

App components use **hooks** (client) or **fetchers via RSC prefetch** (server). Do not call `clientApiJson` directly in `app/`.



See also [`lib/query/README.md`](../query/README.md) for cache invalidation policy.



## Errors



All JSON helpers throw `ApiError` with `status`, `message`, and optional `code` (e.g. `BFF_UNAUTHORIZED`).



## Mutations



Follow [api-mutations.md](../../../.agents/skills/bondery-specific/references/api-mutations.md): use the object returned by create/update endpoints for **navigation only**; update UI via TanStack Query `invalidateQueries`.



## Regression checks



```bash

npm run check-api-fetch

npm run check-query-patterns

```

