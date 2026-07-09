# `apps/webapp/src/lib`

Client infrastructure for the Next.js webapp. **`lib/` root has no `.ts` files** — only subsystem folders. UI components live under `src/components/`, not here.

## Subsystems

| Folder | Responsibility |
|--------|----------------|
| `platform/` | Env URLs, hotkeys, debounce constants, form option lists |
| `api/` | HTTP transport, `resources/` (paths + parsers), `domains/` (reads + writes) — see [`api/README.md`](./api/README.md) |
| `query/` | TanStack Query keys, hooks, prefetch, invalidation — see [`query/README.md`](./query/README.md) |
| `contacts/` | Contact display helpers (avatars, names, search, activity types, social tooltips, shared table/map types) |
| `auth/` | Session teardown, locale detection, unauthorized redirects |
| `supabase/` | Browser and server Supabase clients |
| `i18n/` | Translation loading, locale hooks, relative time formatting |
| `extension/` | Extension detection, enrich batch store, notification store (no React UI) |
| `modals/` | Modal dismiss/blocking primitives — see [`modals/README.md`](./modals/README.md) |
| `sync/` | Sync wake WebSocket client |
| `analytics/` | Client/server analytics capture |
| `shared/` | Cross-cutting utilities without a feature owner |
| `app/` | Server bootstrap probes (`getAppBootstrap`) |
| `home/` | Home feature config (`gettingStartedItems`) |

Chrome extension **UI** (notification managers, enrich hook) lives in [`src/components/extension/`](../components/extension/).

## Data flow

```
RSC loaders  →  lib/query/prefetch  →  lib/api/domains/server
Client UI    →  lib/query/hooks      →  lib/api/domains
Transport    →  lib/api/client | lib/api/server  (not in app components)
```

`lib/api/resources/*` holds path builders and response parsers. `lib/api/domains/*` performs fetches. `services/*/queries.ts` on the API side is the server analogue of `lib/query/hooks/*` + `lib/api/domains/*`.

## Where do I put new code?

| Task | Location |
|------|----------|
| New API endpoint client | `api/resources/` + `api/domains/` (+ `domains/server/` for RSC) |
| TanStack hook or prefetch | `query/hooks/` or `query/prefetch/` |
| Contact table/avatar helper | `contacts/` (`table-types.ts`, `formatContactName` from `@bondery/helpers/contact`) |
| Env constant or app-wide config | `platform/config.ts` |
| BFF geocode client | `api/geocode.ts` |
| Extension store or detection | `lib/extension/` |
| Extension notification UI | `components/extension/` |
| Reusable picker/button | `components/shared/` |
| Page-specific UI | `app/(app)/app/<feature>/` — see **Feature route folders** below |
| Cross-route chrome (shell, shared tables) | `components/<domain>/` (shell → `components/shell/`) |

## `src/components/` layout

Cross-route UI shared by multiple `/app/*` routes lives under `src/components/`:

| Subfolder | Contents |
|-----------|----------|
| `shell/` | App shell, page chrome, `UserLocaleProvider` |
| `contacts/`, `map/`, `tags/`, … | Domain widgets used on 2+ routes |
| `shared/` | Generic pickers and buttons |
| `extension/` | Chrome extension notification UI |

Feature-only UI stays in `app/(app)/app/<feature>/components/`.
When a feature `components/` folder grows to **8 or more** files at the same depth, subdivide into focused subfolders (e.g. `chrome/`, `modals/`, `message/`, `cards/`, `import/`) instead of adding more flat files.



Routes under `app/(app)/app/<feature>/` follow a tiered template. Not every tier needs every folder — create `hooks/`, `utils/`, and `editor/` when the first file appears.

```
<feature>/
├── page.tsx              # required — metadata + delegate (server)
├── loading.tsx           # recommended — skeleton on navigation
├── layout.tsx            # optional — i18n preload or sub-route chrome only
├── <Feature>Loader.tsx   # Tier A/D — prefetch + HydrationBoundary
├── <Feature>Client.tsx   # Tier A/C/D — "use client" page shell
├── components/           # feature UI + open*Modal.tsx
├── hooks/                # feature-only use* hooks
├── utils/                # pure helpers, constants, types
└── editor/               # Tier D only — TipTap extensions (person)
```

### Tiers

| Tier | Pattern | Examples |
|------|---------|----------|
| **A** | `page → Loader → Client → components/` | settings, home, groups, fix (`FixClient`), keep-in-touch, interactions, admin/stats, chat (`ChatClient`) |
| **B** | `page` + `Suspense` → sub-loader in `components/` | people |
| **C** | `page → Client` (no prefetch) | map (`MapClient`), onboarding, unavailable (`UnavailableClient`) |
| **D** | Tier A + `hooks/`, `utils/`, subdivided `components/` | person (`PersonClient`), group (`GroupClient`), settings |

Onboarding wizard steps live in `components/Step*.tsx`, not a `steps/` folder.

Page-specific prefetch orchestration (e.g. `prefetchPersonPageQueries.ts`) may stay at the route root next to `*Loader.tsx`.

### Placement rules

- `components/` — JSX and modal openers only; no `use*` hooks; no `*Utils.ts` / `*-helpers.ts`
- `hooks/` — all `use*` files for the route
- `utils/` — pure functions and constants; promote to `lib/contacts/` when shared across routes
- Used on 2+ routes — `components/<domain>/` with optional `hooks/` and `utils/` subfolders

## Layering

**Allowed:** `app/` → `components/` → `lib/`

**Avoid:** `lib/` → `app/` (hooks importing route-tree component types). Shared types belong in `@bondery/schemas` or a dedicated `lib/types/` module.

`lib/` holds infrastructure and hooks, not feature UI. `QueryProvider` and `SettingsCacheSeed` stay in `lib/query/` because they wire TanStack at the app boundary.

## No barrels (except documented)

Import from the module file. Intentional barrels: `lib/modals`, `lib/query/prefetch`. `api/` has no barrel — match import paths to the file you need.
