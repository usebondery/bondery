# Architecture

Bondery is a monorepo managed with [Turborepo](https://turbo.build/repo) and npm workspaces. Apps and shared packages share tooling, types, and translations; Turborepo orchestrates dev, build, lint, and type-check across the tree.

**Repository:** [github.com/usebondery/bondery](https://github.com/usebondery/bondery)

## Mental model

| Layer | Role |
|---|---|
| **Postgres (Supabase)** | Source of truth for all user data |
| **Fastify API** | Auth validation, business logic, list/search endpoints, imports, mobile sync (push/pull/bootstrap) |
| **Clients** | Webapp, mobile, and Chrome extension — auth via Supabase; app data via the API |

Supabase Auth issues JWTs. Clients attach those tokens to API requests. The API uses Supabase (service role or user-scoped client) to read and write Postgres, with Row Level Security on direct database access paths.

Domain mutations (create/update/delete contacts, groups, tags, etc.) live in `apps/api/src/domains/`. REST routes and `POST /api/sync/push` call the same functions so web, mobile, and future clients stay consistent.

## Repository structure

```
bondery/
├── apps/
│   ├── webapp/           # Main web application (Next.js)
│   ├── mobile/           # iOS & Android app (Expo)
│   ├── api/              # REST API server (Fastify)
│   ├── website/          # Public marketing site (Next.js)
│   ├── chrome-extension/ # Browser extension (WXT + React)
│   └── supabase-db/      # Database migrations and seeds
├── packages/
│   ├── schemas/          # Zod schemas, domain types, Supabase generated types, sync protocol
│   ├── translations/     # i18next resources (en, cs, de)
│   ├── helpers/          # Shared utilities, route constants
│   ├── emails/           # Transactional email templates (React Email)
│   ├── mantine-next/     # Shared Mantine components for Next.js apps
│   ├── branding/         # Logos, icons, brand assets
│   └── vcard/            # vCard serialization
└── docs/                 # GitBook documentation
```

## Apps

### `apps/webapp` — Web application

**Source:** [`apps/webapp`](https://github.com/usebondery/bondery/tree/main/apps/webapp) · **Local dev:** port `26632` · [http://localhost:26632](http://localhost:26632)

The primary user-facing product at [app.usebondery.com](https://app.usebondery.com).

| Concern | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router, React Server Components) |
| Language | TypeScript |
| UI | [Mantine v9](https://mantine.dev/) via `@bondery/mantine-next` |
| Supplemental styles | [Tailwind CSS](https://tailwindcss.com/) |
| Data fetching | [TanStack Query](https://tanstack.com/query) + `lib/query/` fetchers and hooks |
| API transport | `clientApi*` / `serverApi*` wrappers in `lib/api/client.ts` |
| Authentication | [Supabase Auth](https://supabase.com/) (`@supabase/ssr`) — sessions only; no direct DB reads for app data |
| Rich text | [Tiptap](https://tiptap.dev/) |
| Localization | [i18next](https://www.i18next.com/) + [react-i18next](https://react.i18next.com/) via `@bondery/translations` (`useWebTranslations`) |
| Icons | [Tabler Icons](https://tabler.io/icons) |

Server components and client hooks call the Fastify API with the user's Supabase JWT. A small set of Next.js route handlers (e.g. streaming chat) proxy to the API after verifying the session locally.

---

### `apps/api` — REST API server

**Source:** [`apps/api`](https://github.com/usebondery/bondery/tree/main/apps/api) · **Local dev:** port `26631` · [http://localhost:26631](http://localhost:26631) · **Production:** [api.usebondery.com](https://api.usebondery.com)

Mobile sync WebSocket: `ws://localhost:26631/api/sync/ws` (same port as the API).

Central backend for all product data and privileged operations.

| Concern | Technology |
|---|---|
| Framework | [Fastify v5](https://fastify.dev/) |
| Language | TypeScript |
| Database | [Supabase](https://supabase.com/) / Postgres (`@supabase/supabase-js`) |
| Domain layer | `src/domains/*` — shared by REST routes and sync push |
| Sync | Changelog pull/bootstrap (`GET /api/sync/pull`, `GET /api/sync/bootstrap`), mutation push (`POST /api/sync/push`) |
| Email | [Nodemailer](https://nodemailer.com/) + [React Email](https://react.email/) templates |
| API contract | Zod schemas in `@bondery/schemas` → generated `apps/api/openapi.yaml` → GitBook |

**API documentation pipeline**

```
Route Zod schema (apps/api/src/routes/*)
  → fastify-zod-openapi + @fastify/swagger
  → apps/api/openapi.yaml (committed artifact)
  → GitBook OpenAPI block in docs/SUMMARY.md
```

CI enforces: every public route has `description` + `response`; `openapi.yaml` is up to date; Redocly lint passes. See [API routes](api-routes.md).

Every authenticated request validates the Supabase JWT. List endpoints follow a shared [pagination contract](../../.agents/skills/bondery-specific/references/api-design.md) (`limit`, `offset`, `search`, `sort`, nested `pagination` object).

---

### `apps/mobile` — Mobile application

**Source:** [`apps/mobile`](https://github.com/usebondery/bondery/tree/main/apps/mobile) · **Local dev (Metro):** port `26634` · [http://localhost:26634](http://localhost:26634)

Native iOS and Android client built with Expo. Offline-capable via local SQLite and server-authoritative pull sync.

| Concern | Technology |
|---|---|
| Framework | [Expo](https://expo.dev/) + [Expo Router](https://docs.expo.dev/router/introduction/) |
| Language | TypeScript |
| UI | [Tamagui](https://tamagui.dev/) |
| Local database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| Read sync | `GET /api/sync/bootstrap` + `GET /api/sync/pull` (batched `sync_change_log`) |
| Write sync | REST when online; `pending_mutations` outbox → `POST /api/sync/push` when offline |
| Authentication | Supabase Auth |
| Localization | i18next via `@bondery/translations` (`useMobileTranslations`) |

See [Local development setup](local-setup.md#7-mobile-application-appsmobile) for running the sync stack locally.

---

### `apps/website` — Marketing site

**Source:** [`apps/website`](https://github.com/usebondery/bondery/tree/main/apps/website) · **Local dev:** port `26630` · [http://localhost:26630](http://localhost:26630)

Public landing page at [usebondery.com](https://usebondery.com).

| Concern | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| UI | [Mantine v9](https://mantine.dev/) |
| Localization | i18next via `@bondery/translations` |

---

### `apps/chrome-extension` — Browser extension

**Source:** [`apps/chrome-extension`](https://github.com/usebondery/bondery/tree/main/apps/chrome-extension) · **Local dev (WXT HMR):** port `26633` · [http://localhost:26633](http://localhost:26633)

Saves contacts from social networks while browsing.

| Concern | Technology |
|---|---|
| Extension framework | [WXT](https://wxt.dev/) |
| UI | React + [Mantine v9](https://mantine.dev/) |
| Authentication | Supabase OAuth via `chrome.identity` |
| Data | Fastify API (contact create/update, redirect endpoint) |
| Supported sites | LinkedIn, Facebook, Instagram |

---

### `apps/supabase-db` — Database

**Source:** [`apps/supabase-db`](https://github.com/usebondery/bondery/tree/main/apps/supabase-db)

PostgreSQL schema, Row Level Security, seeds, and local dev tooling.

| Concern | Technology |
|---|---|
| Database | [PostgreSQL](https://www.postgresql.org/) via Supabase |
| Auth | Supabase Auth (GitHub, LinkedIn OAuth) |
| Migrations | Supabase CLI |

**Local dev ports** (via `npm run start` in this folder; full list in [`supabase/config.toml`](../../apps/supabase-db/supabase/config.toml)):

| Port | Service |
|---|---|
| 54321 | Supabase gateway (REST, Auth, Storage, Realtime) |
| 54322 | Postgres direct |
| 54323 | Studio |
| 54324 | Inbucket (local email catcher) |

Realtime shares **54321** — no separate port.

Run `npm run gen-types` after schema changes to refresh `packages/schemas/src/supabase.types.ts`.

---

{% hint style="info" %}
**Fun fact:** Bondery local apps use consecutive ports in the `2663x` block — phone keypad **B-O-N-D** → **2-6-6-3** ("Dial BOND"). Supabase stays on the industry-standard `5432x` block. Port constants live in [`packages/schemas/src/constants/dev-ports.ts`](../../packages/schemas/src/constants/dev-ports.ts); CI enforces them with `npm run check-dev-ports`.
{% endhint %}

## Shared packages

All compilable packages extend `@bondery/typescript-config` (NodeNext, `declaration` + `declarationMap`). Internal imports use `#*` subpath imports with `.js` extensions; external consumers use `package.json` `exports` (`default` → `dist/`).

| Package | Role |
|---------|------|
| [`packages/typescript-config`](https://github.com/usebondery/bondery/tree/main/packages/typescript-config) | Shared `base.json`, `react-library.json`, `nextjs.json` tsconfigs |
| [`packages/schemas`](https://github.com/usebondery/bondery/tree/main/packages/schemas) | Zod schemas, types, Supabase DB types, sync protocol, locale catalog |
| [`packages/translations`](https://github.com/usebondery/bondery/tree/main/packages/translations) | i18next namespaces and JSON locale files (`en`, `cs`, `de`) |
| [`packages/helpers`](https://github.com/usebondery/bondery/tree/main/packages/helpers) | Shared utilities, `API_ROUTES`, global URLs |
| [`packages/emails`](https://github.com/usebondery/bondery/tree/main/packages/emails) | React Email templates (`preview` for local dev, `dev` for `tsc --watch`) |
| [`packages/mantine-next`](https://github.com/usebondery/bondery/tree/main/packages/mantine-next) | Reusable Mantine components for Next.js apps |
| [`packages/branding`](https://github.com/usebondery/bondery/tree/main/packages/branding) | Logos, icon assets, React icon components (`@bondery/branding/react`) |
| [`packages/vcard`](https://github.com/usebondery/bondery/tree/main/packages/vcard) | vCard generation for API export and share flows |

**Build:** `rimraf dist && tsc` per package. **Exports:** run `npm run sync-exports` after adding public subpaths. **Go-to-definition:** `declarationMap` maps from `dist/*.d.ts` back to `src/`.

### `packages/schemas`

Single source of truth for Zod schemas, inferred TypeScript types, Supabase database types, and the mobile sync protocol (`src/sync/`). Import domain types from here — do not redefine them in apps.

Supported UI locales are declared in [`packages/schemas/locale/supported-locales.json`](https://github.com/usebondery/bondery/blob/main/packages/schemas/locale/supported-locales.json) and exported as `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, and `APP_LOCALE_METADATA` from `@bondery/schemas/locale`.

### `packages/translations`

User-facing copy for webapp, website, mobile, and the Chrome extension. Built on **[i18next](https://www.i18next.com/)** with **[react-i18next](https://react.i18next.com/)** (web) / **expo-localization** + i18next (mobile). Namespace layout and preload groups live in `manifest.json`; CI runs **[i18next-cli](https://github.com/i18next/i18next-cli)** for types, lint, and locale parity checks.

**Supported locales** (source of truth: `supported-locales.json` above — add every new key under `src/locales/{locale}/` for each):

| Code | Language |
|------|----------|
| `en` | English (reference / fallback) |
| `cs` | Czech |
| `de` | German |

In application code, import locale constants from the schemas package (translations re-exports them for convenience):

```typescript
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@bondery/schemas/locale";
import { i18nConfig, resourceLoader } from "@bondery/translations";
```

Markdown docs cannot import TypeScript modules; keep `supported-locales.json` in sync when adding a locale and update this table in the same change.

See also [`packages/translations/README.md`](https://github.com/usebondery/bondery/blob/main/packages/translations/README.md).

### `packages/helpers`

Shared pure utilities, `API_ROUTES`, global URL constants, and platform helpers used across apps.

### `packages/emails`

React Email templates rendered and sent by the API.

**Local dev:** port `26639` · `npm run preview --workspace=@bondery/emails` → [http://localhost:26639](http://localhost:26639). Runs alongside the Chrome extension dev server (`26633`) without a port conflict.

### `packages/mantine-next`

Reusable Mantine-based components (avatars, data tables, modals) shared by webapp and website.

### `packages/branding`

Logos, icon assets, and React icon components.

### `packages/vcard`

vCard generation used by API export and share flows.

---

## Data flow

```
┌─────────────┐     JWT      ┌─────────────┐     SQL/RLS    ┌──────────────┐
│   Clients   │ ──────────▶  │  apps/api   │ ────────────▶  │   Postgres   │
│ web / mobile│ ◀──────────  │  (Fastify)  │ ◀────────────  │  (Supabase)  │
│  extension  │   JSON       └──────┬──────┘                └──────┬───────┘
└──────┬──────┘                     │                               │
       │                            │ pull / bootstrap              │ changelog
       │ Supabase Auth              │                               │
       │ (login only)               ▼                               ▼
       └──────────────────▶  mobile SQLite ◀── sync_change_log ──┘
```

**Webapp and extension:** Supabase for auth; all contact, group, tag, interaction, and settings data through the API.

**Mobile:** Supabase for auth; bootstrap + pull for reads; mutation outbox → sync push for tier-1 writes. Server state wins on pull; optimistic `is_pending` is UI-only until push completes.

**API internals:** Route handlers are thin. `domains/*` functions accept a `DomainContext` (user, Supabase client) and return `{ data, txid }` where sync confirmation is required.

---

## Sync (mobile)

The API validates the session and serves per-user changelog batches from `sync_change_log`.

| Path | Purpose |
|---|---|
| `GET /api/sync/bootstrap` | Initial SQLite snapshot |
| `GET /api/sync/pull` | Incremental batched changes |
| `POST /api/sync/push` | Apply offline mutation outbox |

Protocol version headers (`X-Bondery-Sync-Protocol`, `X-Bondery-SQLite-Schema`) gate compatibility. Full design: [Sync architecture (mobile)](sync-architecture.md).

---

## Related docs

* [Local development setup](local-setup.md)
* [Sync architecture (mobile)](sync-architecture.md)
* [API design reference](../../.agents/skills/bondery-specific/references/api-design.md)
* [API usage reference](../../.agents/skills/bondery-specific/references/api-usage.md)
