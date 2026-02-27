# Setup Guide

This guide covers everything you need to get Bondery running locally for development.

## Prerequisites

- **Node.js** 20 or higher
- **npm** 10 or higher (bundled with Node.js)
- **Docker** (required for running Supabase locally)
- A [Supabase](https://supabase.com) account (for cloud-connected development)

## 1. Clone and Install

```bash
git clone https://github.com/usebondery/bondery
cd bondery
npm install
```

## 2. Configure Environment Variables

Each app needs its own environment file. Copy the examples and fill in the values:

### Webapp (`apps/webapp`)

```bash
cp apps/webapp/.env.development.example apps/webapp/.env.development.local
```

Key variables:
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WEBAPP_URL` | Webapp URL (default: `http://localhost:3002`) |
| `NEXT_PUBLIC_API_URL` | API URL (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `NEXT_PRIVATE_MAPS_KEY` | API key for Mapy.com map tiles (optional) |

### API (`apps/api`)

```bash
cp apps/api/.env.development.example apps/api/.env.development.local
```

Key variables:
| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `PRIVATE_SUPABASE_SECRET_KEY` | Supabase service role key |
| `PRIVATE_EMAIL_HOST` | SMTP host for sending emails |
| `PRIVATE_EMAIL_USER` | SMTP username |
| `PRIVATE_EMAIL_PASS` | SMTP password |
| `PRIVATE_BONDERY_SUPABASE_HTTP_KEY` | Shared secret for Supabase webhook verification |

### Supabase local DB (`apps/supabase-db`)

```bash
cp apps/supabase-db/.env.local.example apps/supabase-db/.env.local
```

### Chrome Extension (optional)

```bash
cp apps/chrome-extension/.env.development.example apps/chrome-extension/.env.development.local
```

## 3. Start Supabase Locally

Bondery uses Supabase for the database and authentication. To run it locally:

```bash
cd apps/supabase-db
npx supabase start
```

This starts a local Supabase instance at `http://localhost:54321`. After starting, Supabase prints the anon key and service role key — copy these into your `.env.development.local` files.

To stop the local instance:

```bash
npx supabase stop
```

## 4. Start Development Servers

From the root of the monorepo:

```bash
# Start webapp + API (recommended for most development)
npm run dev:core
```

Or start everything including supabase watcher:

```bash
npm run dev
```

Apps will be available at:
- **Website**: http://localhost:3000
- **API**: http://localhost:3001
- **Webapp**: http://localhost:3002
- **Supabase Studio**: http://localhost:54323

## 5. Build Shared Packages (first run only)

If you encounter type or import errors on first run, build the shared packages first:

```bash
npm run build --filter=@bondery/types --filter=@bondery/branding
```

## Development Tips

### Type checking

```bash
npm run check-types
```

### Linting

```bash
npm run lint
```

### Generate Supabase types

When the database schema changes, regenerate the TypeScript types:

```bash
cd apps/supabase-db
npm run gen-types
```

### Adding translations

Add new strings to both `packages/translations/src/en.ts` and `packages/translations/src/cz.ts`. Never hardcode user-facing strings in components.

## Chrome Extension Development

```bash
npm run dev:extension
```

This starts the webapp, API, and Chrome extension builder simultaneously. To load the extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `apps/chrome-extension/dist`

## Troubleshooting

**Port conflicts**: Make sure ports 3000, 3001, 3002, and 54321–54323 are free before starting.

**Type errors after pulling**: Run `npm install` and `npm run build --filter=@bondery/types` to rebuild shared packages.

**Supabase connection errors**: Ensure Docker is running and you have run `npx supabase start` in `apps/supabase-db`.
