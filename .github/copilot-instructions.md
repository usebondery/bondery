# Copilot Instructions for Bondery

This document provides context for GitHub Copilot coding agent to understand the Bondery codebase and work effectively with it.

## Project Overview

Bondery is an open-source personal network manager that helps users build and maintain meaningful relationships. It stores contacts, tracks interactions, and integrates with social media platforms.

## Repository Structure

This is a **Turbo monorepo** managed with npm workspaces:

```
bondery/
├── apps/
│   ├── webapp/          # Next.js authenticated web application (port 3002)
│   ├── api/             # Fastify REST API server (port 3001)
│   ├── website/         # Next.js public landing page (port 3000)
│   ├── chrome-extension # Browser extension for social media imports
│   └── supabase-db/     # Supabase database configuration and migrations
├── packages/
│   ├── branding/        # Shared logo and branding components
│   ├── emails/          # React Email templates
│   ├── helpers/         # Shared utility functions
│   ├── mantine-next/    # Mantine UI Next.js wrappers
│   ├── translations/    # i18n dictionaries (EN, CZ)
│   └── types/           # Shared TypeScript interfaces and Supabase types
└── .agents/skills/      # AI coding agent skill guides
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Mantine UI + Tailwind CSS |
| Backend | Fastify 5, Node.js, TypeScript |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Monorepo | Turborepo + npm workspaces |
| i18n | next-intl (EN and CZ only) |
| Browser Extension | Parcel bundler |
| Email | Nodemailer + React Email |
| Maps | MapLibre GL + Leaflet |

## Development Commands

```bash
# Install all dependencies
npm install

# Start all core apps in development (webapp, api, emails)
npm run dev:core

# Start only webapp + api (most common)
turbo dev --filter=webapp --filter=api

# Build all apps
npm run build

# Type checking across all packages
npm run check-types

# Lint all packages
npm run lint
```

Each app runs at:
- **Website**: http://localhost:3000
- **API**: http://localhost:3001
- **Webapp**: http://localhost:3002
- **Supabase** (local): http://localhost:54321

## Environment Setup

Each app has example env files. Copy and fill them before running:

```bash
# Webapp
cp apps/webapp/.env.development.example apps/webapp/.env.development.local

# API
cp apps/api/.env.development.example apps/api/.env.development.local

# Supabase local DB
cp apps/supabase-db/.env.local.example apps/supabase-db/.env.local
```

Key environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `PRIVATE_SUPABASE_SECRET_KEY` — Supabase service role key (API only)
- `NEXT_PUBLIC_API_URL` — API server URL

## Code Guidelines

### General

- **DRY**: Avoid duplication; create reusable components and functions.
- **Descriptive names**: Use `isLoading`, `hasError`, `contactList` style naming.
- **Error handling**: Use try-catch in server components and API route handlers.
- **Localization**: All user-facing strings must go in `/packages/translations` (EN + CZ). Never hardcode UI text.
- **TypeScript**: Always use types from `@bondery/types` and `supabase.types.ts` for database records.

### Next.js (webapp)

- Prefer **server components** for data fetching — pass data as props to client components.
- Use `"use client"` only when interactivity is needed.
- For Mantine components in server components, use named imports (`MenuItem` instead of `Menu.Item`) for SSR compatibility.
- Modals must use the **Mantine modals manager**, not the `Modal` component directly.
- Notifications and modals should be defined in the client component, not a parent server component.

### Supabase

- Import Supabase clients from the shared library (`@bondery/helpers` or `src/lib/supabase`).
- Use types from `supabase.types.ts` for all database operations.
- When adding a new table or column, update `supabase.types.ts` accordingly.
- New tables must have proper **Row Level Security (RLS)** policies.
- Place SQL migrations in `apps/supabase-db/supabase/migrations/`.

### API (Fastify)

- Routes live in `apps/api/src/routes/`.
- Authenticate requests by verifying the Supabase session cookie.
- Use the shared Supabase client from `src/lib/supabase.ts`.
- Validate request bodies with Fastify schema validation.

### Shared Packages

- `@bondery/types` — Core TypeScript interfaces (Contact, Group, User, etc.)
- `@bondery/translations` — Import localized strings from here, never hardcode UI text
- `@bondery/helpers` — Shared utilities and environment helpers
- `@bondery/emails` — React Email templates for transactional email

## Feature Areas

| Feature | Location |
|---|---|
| Contacts (people) | `webapp/src/app/(app)/app/people/`, `api/src/routes/contacts/` |
| Groups | `webapp/src/app/(app)/app/groups/`, `api/src/routes/groups/` |
| Timeline | `webapp/src/app/(app)/app/timeline/` |
| Map view | `webapp/src/app/(app)/app/map/` |
| Settings & imports | `webapp/src/app/(app)/app/settings/`, `api/src/routes/settings/` |
| Reminders | `api/src/routes/reminders/` |
| Social imports | `api/src/routes/contacts/import/` (LinkedIn, Instagram) |
| Chrome extension | `apps/chrome-extension/` |
| Email templates | `packages/emails/` |
| Database schema | `apps/supabase-db/supabase/migrations/` |

## Changelog

All changes must be documented in `CHANGELOG.md` following the format in `.github/instructions/changelog.instructions.md`. Categories: Added, Fixed, Changed, Security, Documentation, Style, Performance, Tests, CI, Dependencies.

## Agent Skills

The `.agents/skills/` directory contains detailed best-practice guides for use with AI coding agents:

- `mantine-best-practices/` — Mantine UI component patterns
- `next-best-practices/` — Next.js patterns (RSC, data fetching, routing)
- `supabase-postgres-best-practices/` — Database query and RLS patterns
- `vercel-react-best-practices/` — React performance optimization
- `seo-audit/` — SEO guidelines
- `web-design-guidelines/` — UI/UX design standards

Refer to these when working on their respective areas.
