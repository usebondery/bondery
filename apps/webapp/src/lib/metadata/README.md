# Document titles

Server-owned tab titles with a narrow client layer for entity routes only.

## Ownership

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Server | `generateMetadata` in `page.tsx` or `layout.tsx` | All static routes, hard refresh, bookmarks, crawlers, soft-nav metadata stream |
| Client | `DocumentTitleProvider` in app shell | Entity routes only — optimistic nav, query-cache hit, rename patch |
| Mutation | `usePatchDocumentTitle` in detail clients | Entity rename after load |

Do not use `router.refresh()` for titles. Do not mount `*DocumentTitle` in layouts.

**Client rule:** If the coordinator cannot produce a resolved string, it must not write `document.title` (static routes defer to server metadata).

## Adding a static route

1. Add `generateMetadata` in `page.tsx` using `staticPageTitle(t("Title"))`, or in a segment `layout.tsx` if shared across child pages.

## Adding a dynamic entity route

1. Add pattern to [`routeTitleRegistry.ts`](./routeTitleRegistry.ts) (`matchDynamicRoute`).
2. Add `generateMetadata` with `cache(get*DetailServer)` + `entityPageTitle` in `page.tsx`.
3. Call `usePatchDocumentTitle` in the detail client for renames.
4. Use `useNavigateWithTitle` or `setOptimisticDocumentTitle` when the display name is known before navigation.

## Key modules

- [`pageTitles.ts`](./pageTitles.ts) — `staticPageTitle` / `entityPageTitle` (server Metadata API)
- [`routeTitleRegistry.ts`](./routeTitleRegistry.ts) — dynamic pathname matching (person, group, myself)
- [`resolveClientRouteTitle.ts`](./resolveClientRouteTitle.ts) — entity-only client resolution (cache + optimistic)
- [`navigationTitleStore.ts`](./navigationTitleStore.ts) — optimistic title before `router.push`
- [`useNavigateWithTitle.ts`](./useNavigateWithTitle.ts) — navigation helper
- [`optimisticTitles.ts`](./optimisticTitles.ts) — format person/group titles for optimistic nav
