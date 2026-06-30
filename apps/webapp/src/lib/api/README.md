# Webapp API clients



Transport layer for HTTP. **Mutations and queries** go through `lib/api/domains/*` and `lib/query/hooks/*` — not raw `clientApiJson` in app components.



## Browser (`clientApi*`)



Import from `@/lib/api/client`. Always use same-origin paths from `API_ROUTES` (`/api/...`).



| Function | Use when |

|----------|----------|

| `clientApiJson<T>` | POST/PATCH/DELETE or GET where errors should throw |

| `clientApiJsonOrNull<T>` | Prefetch, search, chips — return `null` on failure |

| `clientApiFetch` | FormData uploads, blob downloads, custom status handling (401/409) |



**Never** import `API_URL` in `"use client"` files.



## Server (`serverApi*`)



Import from `@/lib/api/server`. Used in RSC pages, loaders, and route handlers.



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

