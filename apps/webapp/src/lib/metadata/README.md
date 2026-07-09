# Document titles

Dual-layer tab titles: server metadata for SSR/SEO, client coordinator for in-app navigation.

## Ownership

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Server | `generateMetadata` in `page.tsx` | Hard refresh, bookmarks, crawlers |
| Client | `DocumentTitleProvider` in app shell | Soft navigation — instant titles |
| Mutation | `usePatchDocumentTitle` in detail clients | Rename after load |

Do not use `router.refresh()` for titles. Do not mount `*DocumentTitle` in layouts.

## Adding a static route

1. Add entry to [`lib/navigation/appNavLinks.ts`](../navigation/appNavLinks.ts) (sidebar + registry).
2. Add `generateMetadata` in `page.tsx` using `staticPageTitle(t("Title"))`.
3. Run `npm run check-route-titles`.

## Adding a dynamic entity route

1. Add pattern to [`routeTitleRegistry.ts`](./routeTitleRegistry.ts) (`matchDynamicRoute`).
2. Add `generateMetadata` with `cache(get*DetailServer)` + `entityPageTitle`.
3. Call `usePatchDocumentTitle` in the detail client for renames.
4. Use `useNavigateWithTitle` or `onNavigate` on links when the display name is known before navigation.

## Key modules

- [`pageTitles.ts`](./pageTitles.ts) — `staticPageTitle` / `entityPageTitle` (server Metadata API)
- [`routeTitleRegistry.ts`](./routeTitleRegistry.ts) — pathname → title resolver config
- [`resolveClientRouteTitle.ts`](./resolveClientRouteTitle.ts) — client resolution (registry + query cache)
- [`navigationTitleStore.ts`](./navigationTitleStore.ts) — optimistic title before `router.push`
- [`useNavigateWithTitle.ts`](./useNavigateWithTitle.ts) — navigation helper
- [`optimisticTitles.ts`](./optimisticTitles.ts) — format person/group titles for optimistic nav

## Regression

```bash
npm run check-route-titles
```
