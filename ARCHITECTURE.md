# Architecture

This document describes the technical architecture of the Bondery monorepo.

## Overview

Bondery is structured as a **Turbo monorepo** with multiple deployable applications and shared packages. All apps share a common Supabase backend for database, authentication, and storage.

```
┌─────────────────────────────────────────────────────┐
│                     User Browser                    │
│                                                     │
│  ┌─────────────────┐     ┌───────────────────────┐  │
│  │  Webapp          │     │  Chrome Extension     │  │
│  │  (Next.js :3002) │     │  (Parcel extension)   │  │
│  └────────┬─────────┘     └───────────┬───────────┘  │
│           │ HTTP/REST                 │              │
└───────────┼───────────────────────────┼──────────────┘
            │                           │
            ▼                           ▼
  ┌──────────────────────────────────────────────────┐
  │               API Server (Fastify :3001)          │
  │  /api/contacts  /api/groups  /api/settings        │
  │  /api/account   /api/reminders  /api/events       │
  └───────────────────────┬──────────────────────────┘
                          │
                          ▼
  ┌──────────────────────────────────────────────────┐
  │               Supabase                            │
  │  ┌────────────────┐  ┌──────────────────────┐    │
  │  │  PostgreSQL DB │  │  Auth (JWT/sessions)  │    │
  │  └────────────────┘  └──────────────────────┘    │
  └──────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────┐
  │               Website (Next.js :3000)             │
  │  Public landing page — no auth required           │
  └──────────────────────────────────────────────────┘
```

## Applications

### `apps/webapp` — Authenticated Web Application

The main user-facing app built with **Next.js 16 App Router** and **React 19**.

**Authentication**: Supabase Auth via session cookies. Unauthenticated users are redirected to `/login`.

**Route structure** (`src/app/`):

```
(app)/
  app/
    home/          # Dashboard / home page
    people/        # Contact list
    person/[id]/   # Contact detail page
    groups/        # Group list
    group/[id]/    # Group detail page
    timeline/      # Interaction timeline
    map/           # Geographic map of contacts
    settings/      # User preferences and data imports
  auth/            # OAuth callback handling
  login/           # Login page
```

**Key libraries**: Mantine UI, Tailwind CSS, next-intl, MapLibre GL, Leaflet, TipTap (rich text), dnd-kit (drag and drop), PostHog (analytics).

### `apps/api` — REST API Server

A **Fastify 5** server that handles all data operations. Authenticates requests using the Supabase session cookie passed from the webapp.

**API routes** (`src/routes/`):

| Route | Purpose |
|---|---|
| `GET/POST /api/account` | User account management |
| `GET/POST/DELETE /api/contacts` | Contact CRUD |
| `POST /api/contacts/import/linkedin` | LinkedIn ZIP import |
| `POST /api/contacts/import/instagram` | Instagram data import |
| `GET/POST /api/groups` | Group management |
| `GET/POST /api/events` | Interaction events |
| `GET/POST /api/reminders` | Contact reminders |
| `GET/POST /api/settings` | User settings |
| `POST /api/feedback` | User feedback submission |

### `apps/website` — Public Landing Page

Static-first **Next.js** marketing site. No authentication required. Contains the homepage, features overview, pricing, FAQ, and team information.

### `apps/chrome-extension` — Browser Extension

A Chrome extension built with **Parcel** that integrates with social media platforms (LinkedIn, Instagram) to extract contact information and send it to the API for import.

**Architecture**: Background service worker + popup UI + content scripts per supported platform.

### `apps/supabase-db` — Database Configuration

Contains all Supabase infrastructure:
- `supabase/migrations/` — SQL migration files (run in order)
- `supabase/functions/` — Supabase Edge Functions (crons, webhooks)
- `supabase/vault/` — Vault secrets configuration
- `supabase/seed.sql` — Development seed data

## Shared Packages

### `@bondery/types`

Core TypeScript interfaces shared across all apps. Key types:

- `Contact` — Person record with social links, notes, groups
- `Group` — Contact group
- `User` — Authenticated user profile
- `Database` — Full Supabase database schema types (generated)

Import from `@bondery/types`.

### `@bondery/translations`

Localization dictionaries for English (`en`) and Czech (`cz`). All user-visible strings must be added here. Never hardcode text in UI components.

```typescript
import { getDictionary } from "@bondery/translations";
const dict = await getDictionary("en");
```

### `@bondery/helpers`

Shared utility functions:
- Environment variable validation (`checkEnv`)
- Instagram/LinkedIn data parsing helpers
- Global type utilities

### `@bondery/emails`

React Email templates for transactional email (reminders, notifications). Rendered server-side and sent via Nodemailer in the API.

### `@bondery/branding`

Shared brand assets: logo SVG, social platform icons, brand colors. Used across webapp and website.

### `@bondery/mantine-next`

Thin wrappers to integrate **Mantine UI** with Next.js App Router. Provides the `MantineProvider` setup and resolves server-side rendering compatibility.

## Data Flow

### Contact Import (LinkedIn example)

```
User uploads ZIP  →  webapp uploads to API
  →  API parses CSV (Connections.csv)
  →  API creates/updates contacts in Supabase
  →  webapp displays imported contacts
```

### Social Media via Chrome Extension

```
User visits LinkedIn profile  →  Extension extracts data
  →  Extension sends POST to API
  →  API stores social media link to contact
  →  Webapp displays enriched contact
```

### Authentication Flow

```
User visits webapp  →  Next.js middleware checks Supabase session
  →  No session → redirect to /login
  →  Valid session → render app
  →  API requests include session cookie for server-side auth
```

## Database Schema (key tables)

| Table | Description |
|---|---|
| `people` | Core contact records |
| `people_social_media` | Social media profiles linked to contacts |
| `groups` | Contact groups |
| `people_groups` | Many-to-many: contacts ↔ groups |
| `events` | Interaction events (calls, meetings, etc.) |
| `reminders` | Scheduled reminders for contacts |
| `user_settings` | Per-user preferences |

All tables have **Row Level Security (RLS)** enabled so users can only access their own data.

## Build System

**Turborepo** orchestrates builds across all packages, with caching to avoid redundant work. Dependency graph:

```
webapp  →  @bondery/types, @bondery/translations, @bondery/branding, @bondery/mantine-next
api     →  @bondery/types, @bondery/helpers, @bondery/emails
website →  @bondery/types, @bondery/branding, @bondery/translations
```

Build shared packages before running apps:

```bash
npm run build --filter=@bondery/types --filter=@bondery/branding
```
