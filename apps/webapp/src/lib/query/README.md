# TanStack Query layer

Client cache on top of [`lib/api`](../api/README.md). Components use **hooks** and **domain APIs** — not raw `clientApiJson` in `app/`.

## Three-layer data access

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `lib/api/domains/*` | HTTP verbs, request bodies, typed responses — no React |
| **Fetchers** | `lib/query/fetchers/*` | Path builders, normalizers, `createXQueryFn` for TanStack Query |
| **Hooks** | `lib/query/hooks/*` | `useQuery` / `useMutation`, query keys, cache invalidation |

App components use **hooks** (client) or **fetchers via RSC prefetch** (server). Do not call `clientApiJson` directly in `app/`.

## Invalidate-first policy

After every successful mutation, call `invalidateQueries` on affected keys. Do **not** use:

- `onMutate` optimistic updates
- `setQueryData` to guess next state

**Exception:** read mutation response IDs for navigation only (e.g. `router.push` after create).

| Operation | Invalidation |
|-----------|--------------|
| Contact PATCH/DELETE | `contactKeys.detail(id)` + `contactKeys.lists()` or `contactKeys.all` |
| Import / merge / bulk delete | `invalidateAfterImport()` or `contactKeys.all` |
| Enrich batch | `invalidateAfterEnrichBatch()` when batch **completes**, not on trigger POST |
| Photo upload | `contactKeys.detail(id)` |

## Inline field edits

Keep **local state** while typing. On save: show loader → domain mutation → `invalidateQueries` → refetch updates UI. On error: revert local state from query data.

## Auth and API outages

401 and API-unavailable redirects are handled in **`lib/api/client.ts`** (transport), not in this query layer.

- `clientApiJson` → `applyTransportErrorPolicy` → `endSession` (401) or `/app/unavailable` (502/503/504/network)
- This module only configures cache defaults and skips retries for classified transport errors

See bondery-specific `references/api-usage.md` § Session teardown and § API unavailable handling.

## Fetchers

Use `createClientFetcher()` in client hooks and `serverQueryFns.ts` (server-only) for RSC prefetch. Share path builders + normalizers per resource. Query keys use entity params only (`id`, `sort`, `q`, `limit`, `offset`) — not avatar query strings.

## Adding a domain

1. `lib/api/domains/<name>.ts` — mutation/read functions
2. `lib/query/fetchers/<name>.ts` — normalizers + `createXQueryFn`
3. `lib/query/keys.ts` — key factory
4. `lib/query/hooks/use<Name>.ts` — `useQuery` / `useMutation` with invalidation
5. RSC page: `prefetchQuery` + `HydrationBoundary`

## Regression

```bash
npm run check-query-patterns        # warn-only during migration
npm run check-query-patterns:strict # enforced in check-types after Phase 10
```
