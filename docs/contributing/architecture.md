# Architecture

Bondery is a monorepo managed with [Turborepo](https://turbo.build/repo) and npm workspaces. Apps and shared packages share tooling, types, and translations; Turborepo orchestrates dev, build, lint, and type-check across the tree.

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
│   ├── translations/     # Localization strings (EN, CS)
│   ├── helpers/          # Shared utilities, route constants, dev ports
│   ├── emails/           # Transactional email templates (React Email)
│   ├── mantine-next/     # Shared Mantine components for Next.js apps
│   ├── branding/         # Logos, icons, brand assets
│   └── vcard/            # vCard serialization
└── docs/                 # GitBook documentation
```

## Apps

### `apps/webapp` — Web application

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
| Localization | `@bondery/translations` via `useWebTranslations` |
| Icons | [Tabler Icons](https://tabler.io/icons) |

Server components and client hooks call the Fastify API with the user's Supabase JWT. A small set of Next.js route handlers (e.g. streaming chat) proxy to the API after verifying the session locally.

**Dev port:** `3002`

---

### `apps/api` — REST API server

Central backend for all product data and privileged operations.

| Concern | Technology |
|---|---|
| Framework | [Fastify v5](https://fastify.dev/) |
| Language | TypeScript |
| Database | [Supabase](https://supabase.com/) / Postgres (`@supabase/supabase-js`) |
| Domain layer | `src/domains/*` — shared by REST routes and sync push |
| Sync | Changelog pull/bootstrap (`GET /api/sync/pull`, `GET /api/sync/bootstrap`), mutation push (`POST /api/sync/push`) |
| Email | [Nodemailer](https://nodemailer.com/) + [React Email](https://react.email/) templates |
| API contract | OpenAPI spec in `openapi.yaml`, generated from route modules |

Every authenticated request validates the Supabase JWT. List endpoints follow a shared [pagination contract](../../.agents/skills/bondery-specific/references/api-design.md) (`limit`, `offset`, `search`, `sort`, nested `pagination` object).

**Dev port:** `3001` | **Production:** `api.usebondery.com`

---

### `apps/mobile` — Mobile application

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

See [Local development setup](local-setup.md#7-mobile-application-appsmobile) for running the sync stack locally.

---

### `apps/website` — Marketing site

Public landing page at [usebondery.com](https://usebondery.com).

| Concern | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| UI | [Mantine v9](https://mantine.dev/) |
| Localization | `@bondery/translations` |

**Dev port:** `3000`

---

### `apps/chrome-extension` — Browser extension

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

PostgreSQL schema, Row Level Security, seeds, and local dev tooling.

| Concern | Technology |
|---|---|
| Database | [PostgreSQL](https://www.postgresql.org/) via Supabase |
| Auth | Supabase Auth (GitHub, LinkedIn OAuth) |
| Migrations | Supabase CLI |

Run `npm run gen-types` after schema changes to refresh `packages/schemas/src/supabase.types.ts`.

---

## Shared packages

### `packages/schemas`

Single source of truth for Zod schemas, inferred TypeScript types, Supabase database types, and the mobile sync protocol (`src/sync/`). Import domain types from here — do not redefine them in apps.

### `packages/translations`

User-facing strings for webapp, website, and mobile. English and Czech. Add keys to both locale files.

### `packages/helpers`

Shared pure utilities, `API_ROUTES`, dev port constants, and platform helpers used across apps.

### `packages/emails`

React Email templates rendered and sent by the API.

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
