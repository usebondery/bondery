# TanStack Query layer

Client cache on top of [`lib/api`](../api/README.md). Components use **hooks** and **domain APIs** — not raw `clientApiJson` in `app/`.

## Domain-first reads

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Resources** | `lib/api/resources/*` | Path builders + response parsers (no transport, no React) |
| **Client domain** | `lib/api/domains/*` | `clientApiJson` reads and all writes |
| **Server domain** | `lib/api/domains/server/*` | `serverApiJson` reads + `next.tags` (import `server-only`) |
| **Prefetch** | `lib/query/prefetch/*` | Thin RSC helpers wrapping `prefetchQuery` + server domains |
| **Hooks** | `lib/query/hooks/*` | `useQuery` / `useMutation`, query keys, cache invalidation |

**Reads:** hooks call `lib/api/domains/*`; loaders call `lib/api/domains/server/*` or `lib/query/prefetch/*`.

**New reads:** add `resources/` + client domain + server domain — not `createXQueryFn` factories.

Layout loads **session** via `getAppSession()` → `GET /api/me/session` (shell identity + routing). **Settings** (`useSettingsQuery`) are for Home and Settings only — prefetch in those loaders, never for shell identity. After identity-changing mutations, call `refreshAppShell()`. Theme: see [`lib/theme/README.md`](../theme/README.md).

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

See bondery-specific `references/api/api-usage.md` § Session teardown and § API unavailable handling.

## Adding a resource

1. `lib/api/resources/<name>.ts` — `build*` paths + `parse*` / `normalize*`
2. `lib/api/domains/<name>.ts` — client read functions + mutations
3. `lib/api/domains/server/<name>.ts` — server read functions with cache tags
4. `lib/query/keys.ts` — key factory
5. `lib/query/hooks/use<Name>.ts` — `queryFn: () => getX(...)` with invalidation on mutations
6. `lib/query/prefetch/<name>.ts` — optional loader helper (import via `@/lib/query/prefetch` barrel)
7. RSC page: `prefetchQuery` + `HydrationBoundary`

`lib/query/contactsListParams.ts` parses URL search/sort into canonical contacts list filter params.

## Document titles

Server `generateMetadata` for all routes; client `DocumentTitleProvider` for entity routes only. See [`lib/metadata/README.md`](../metadata/README.md).
