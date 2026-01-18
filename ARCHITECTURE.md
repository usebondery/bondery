# Bondery Architecture

This document describes the modular architecture after splitting the monolithic Next.js app into separate deployable units.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            BONDERY MONOREPO                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   apps/website  │  │   apps/webapp   │  │      apps/server        │  │
│  │   (Next.js)     │  │   (Next.js)     │  │       (Fastify)         │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────────────┤  │
│  │ usebondery.com  │  │app.usebondery   │  │  api.usebondery.com     │  │
│  │                 │  │     .com        │  │                         │  │
│  │ • Landing page  │  │ • Authenticated │  │ • REST API              │  │
│  │ • Marketing     │  │   app routes    │  │ • Supabase integration  │  │
│  │ • Public pages  │  │ • Relationships │  │ • Auth validation       │  │
│  │                 │  │ • Person detail │  │ • CRUD operations       │  │
│  │                 │  │ • Settings      │  │                         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           │                    │    API Requests        │               │
│           │                    └───────────────────────►│               │
│           │                                             │               │
│  ┌────────┴────────────────────────────────────────────┴────────────┐  │
│  │                      packages/types (@bondery/types)              │  │
│  │  • Shared TypeScript types (Contact, UserSettings, etc.)          │  │
│  │  • Database types from Supabase                                   │  │
│  │  • API response types                                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │ packages/branding │  │packages/helpers  │  │packages/translations│  │
│  │ • Logo assets     │  │ • Utility funcs  │  │ • i18n strings      │  │
│  │ • Theme config    │  │ • env checking   │  │ • EN/CS languages   │  │
│  └───────────────────┘  └──────────────────┘  └────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Deployment Structure

| App | Domain | Purpose |
|-----|--------|---------|
| **website** | `usebondery.com` | Public landing page, marketing, SEO |
| **webapp** | `app.usebondery.com` | Authenticated application |
| **server** | `api.usebondery.com` | REST API backend |

## Data Flow

1. **User visits `usebondery.com`** → Website serves landing page
2. **User clicks "Login"** → Redirected to `app.usebondery.com/login`
3. **User authenticates via OAuth** → Supabase handles auth, sets session cookies
4. **Webapp makes API calls** → Requests go through Next.js rewrites to `api.usebondery.com`
5. **Server validates session** → Uses `@supabase/ssr` to validate cookies
6. **Server returns data** → Database operations via Supabase client

## Authentication Flow

```
┌──────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────┐
│  User    │───►│    Webapp     │───►│ Supabase Auth  │───►│  OAuth   │
│          │    │(app.bondery)  │    │    Server      │    │ Provider │
└──────────┘    └───────────────┘    └────────────────┘    └──────────┘
                       │                     │
                       │  Session Cookie     │
                       ◄─────────────────────┘
                       │
                       │  API Request + Cookie
                       ▼
               ┌───────────────┐    ┌────────────────┐
               │    Server     │───►│    Supabase    │
               │(api.bondery)  │    │    Database    │
               └───────────────┘    └────────────────┘
```

## Environment Variables

### Website (apps/website)
```env
NEXT_PUBLIC_APP_URL=https://app.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
```

### Webapp (apps/webapp)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
NEXT_PUBLIC_APP_URL=https://app.usebondery.com
NEXT_PUBLIC_API_URL=https://api.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
```

### Server (apps/server)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=xxx
SUPABASE_SECRET_KEY=xxx
APP_URL=https://app.usebondery.com
WEBSITE_URL=https://usebondery.com
API_URL=https://api.usebondery.com
PORT=3001
```

## Development

### Running All Apps
```bash
# Install dependencies
pnpm install

# Run all apps in development
pnpm dev

# Or run specific apps
pnpm dev --filter=website
pnpm dev --filter=webapp
pnpm dev --filter=server
```

### Default Ports
- Website: `http://localhost:3000`
- Webapp: `http://localhost:3002`
- Server: `http://localhost:3001`

## Package Dependencies

```
@bondery/types     ← Used by: webapp, server
@bondery/branding  ← Used by: website, webapp
@bondery/helpers   ← Used by: website, webapp, server
@bondery/translations ← Used by: website, webapp
```

## API Endpoints (Server)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List all contacts |
| GET | `/api/contacts/:id` | Get single contact |
| POST | `/api/contacts` | Create contact |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts` | Delete contacts (batch) |
| GET | `/api/account` | Get current user |
| PUT | `/api/account/photo` | Upload user photo |
| DELETE | `/api/account` | Delete user account |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |
| GET | `/api/redirect/:provider` | OAuth redirect helper |

## Migration from Old Architecture

The original `apps/web` combined:
- Landing page routes
- Authenticated app routes
- API routes (Next.js API routes)

Now split into:
- `apps/website` - Landing pages only
- `apps/webapp` - Authenticated routes only
- `apps/server` - Dedicated API server

The `apps/web` folder can be removed once migration is verified complete.
