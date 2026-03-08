# Architecture

Bondery is a monorepo managed with [Turborepo](https://turbo.build/repo) and npm workspaces. All apps and shared packages live in the same repository, sharing a single `node_modules` resolution and a common build/lint/type-check pipeline.

## Repository structure

```
bondery/
├── apps/
│   ├── webapp/           # Main web application (Next.js)
│   ├── api/              # REST API server (Fastify)
│   ├── website/          # Public marketing site (Next.js)
│   ├── chrome-extension/ # Browser extension (WXT + React)
│   └── supabase-db/      # Database, migrations & edge functions
├── packages/
│   ├── types/            # Shared TypeScript types & Supabase schema
│   ├── translations/     # Localization strings (EN, CZ)
│   ├── helpers/          # Shared utility functions
│   ├── emails/           # Transactional email templates
│   ├── mantine-next/     # Mantine provider wrappers for Next.js
│   └── branding/         # Brand assets, logos and icon generators
└── docs/                 # GitBook documentation
```

## Apps

### `apps/webapp` — Web Application

The primary user-facing product.

| Concern | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router, React Server Components) |
| Language | TypeScript |
| UI library | [Mantine v8](https://mantine.dev/) |
| Supplemental styles | [Tailwind CSS](https://tailwindcss.com/) |
| Authentication & database | [Supabase](https://supabase.com/) (`@supabase/ssr`) |
| Rich text editor | [Tiptap](https://tiptap.dev/) |
| Drag and drop | [dnd-kit](https://dndkit.com/) |
| Localization | [next-intl](https://next-intl.dev/) |
| Icons | [Tabler Icons](https://tabler.io/icons) |

The webapp communicates directly with Supabase for real-time data and auth, and calls `apps/api` for heavier operations (import/export, account management, etc.).

**Dev port:** `3002`

---

### `apps/api` — REST API Server

A lightweight backend for operations that can't or shouldn't happen in the browser.

| Concern | Technology |
|---|---|
| Framework | [Fastify v5](https://fastify.dev/) |
| Language | TypeScript |
| Database | [Supabase](https://supabase.com/) (`@supabase/supabase-js`) |
| Email delivery | [Nodemailer](https://nodemailer.com/) with [React Email](https://react.email/) templates |

The API validates a Supabase JWT on every request to identify the acting user. It exposes endpoints for contacts, account management, settings, imports, exports, and the browser extension redirect.

**Dev port:** `3001` | **Production:** `api.usebondery.com`

---

### `apps/website` — Marketing Site

The public landing page at [usebondery.com](https://usebondery.com).

| Concern | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| UI library | [Mantine v8](https://mantine.dev/) |
| Localization | [next-intl](https://next-intl.dev/) |

**Dev port:** `3000` | **Production:** `usebondery.com`

---

### `apps/chrome-extension` — Browser Extension

A Chrome (and Firefox) extension that lets users save contacts from social networks.

| Concern | Technology |
|---|---|
| Extension framework | [WXT](https://wxt.dev/) |
| UI | React + [Mantine v8](https://mantine.dev/) |
| Language | TypeScript |
| Authentication | Supabase OAuth via `chrome.identity` |
| Supported sites | LinkedIn, Facebook, Instagram |

The extension injects content scripts into supported social network pages, extracts contact data from the DOM, and sends it to the Bondery webapp/API.

---

### `apps/supabase-db` — Database

Manages the PostgreSQL schema, Row Level Security policies, seed data, and Supabase Edge Functions.

| Concern | Technology |
|---|---|
| Database | [PostgreSQL](https://www.postgresql.org/) (via Supabase) |
| Auth | Supabase Auth |
| Edge functions | Deno (TypeScript) |
| Migrations | Supabase CLI |

All database types are generated from the live schema into `packages/types/src/supabase.types.ts` and shared across all apps.

---

## Shared packages

### `packages/types`

Single source of truth for TypeScript types across the monorepo. Contains:

- Auto-generated Supabase database types (`supabase.types.ts`)
- Domain-level types shared between apps

Run `npm run gen-types` inside `apps/supabase-db` to regenerate after a schema change.

### `packages/translations`

All user-facing strings for the webapp and website. Supports **English (EN)** and **Czech (CZ)**. Components import from this package rather than hardcoding strings.

### `packages/helpers`

Shared pure utility functions (formatting, validation, etc.) used across multiple apps.

### `packages/emails`

Transactional email templates built with [React Email](https://react.email/). Rendered and sent by `apps/api` via Nodemailer.

### `packages/mantine-next`

Thin wrappers that configure Mantine's `ColorSchemeScript` and `MantineProvider` for use inside Next.js App Router layouts.

### `packages/branding`

Brand assets (logos, social previews) plus icon-generation scripts used by `apps/webapp`, `apps/website`, and `apps/chrome-extension`.

---

## Data flow

```
Browser / Chrome Extension
        │
        ├──▶ apps/webapp (Next.js, port 3002)
        │         │
        │         ├──▶ Supabase (auth + realtime DB)
        │         └──▶ apps/api (REST, port 3001)
        │                   │
        │                   └──▶ Supabase (server-side DB access)
        │
        └──▶ apps/website (Next.js, port 3000)
```

Supabase is the central data store. The webapp uses the Supabase JS client directly for most read/write operations. The API uses the Supabase service role key for privileged operations (e.g., storage, edge function triggers, bulk imports).
