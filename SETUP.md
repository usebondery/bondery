# Bondery - Quick Start Guide

This guide explains how to set up and run the Bondery monorepo after the architectural split.

## 🏗️ Architecture

The monorepo consists of:
- **apps/website** - Public landing page at `usebondery.com`
- **apps/webapp** - Authenticated app at `app.usebondery.com`
- **apps/server** - REST API server at `api.usebondery.com`
- **packages/types** - Shared TypeScript types
- **packages/branding** - Brand assets and theme
- **packages/helpers** - Utility functions
- **packages/translations** - i18n strings (EN/CS)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## 📦 Prerequisites

- Node.js 18+ (tested with v20)
- pnpm 8+
- Supabase project

## 🚀 Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create `.env.development.local` files for each app:

#### apps/webapp/.env.development.local
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
```

#### apps/server/.env.development.local
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
PORT=3001
APP_URL=http://localhost:3002
WEBSITE_URL=http://localhost:3000
API_URL=http://localhost:3001
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

#### apps/website/.env.development.local
```env
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
```

### 3. Build Shared Packages

```bash
pnpm build --filter=@bondery/types
pnpm build --filter=@bondery/branding
pnpm build --filter=@bondery/helpers
pnpm build --filter=@bondery/translations
```

## 🏃 Running the Apps

### Development Mode (All Apps)

```bash
pnpm dev
```

This starts:
- Website on http://localhost:3000
- Server on http://localhost:3001
- Webapp on http://localhost:3002

### Individual Apps

```bash
# Website only
pnpm dev --filter=website

# Server only
pnpm dev --filter=server

# Webapp only
pnpm dev --filter=webapp
```

## 🔧 Common Commands

```bash
# Build all apps
pnpm build

# Type check all apps
pnpm check-types

# Lint all apps
pnpm lint

# Build specific package
pnpm build --filter=@bondery/types
```

## 📝 Development Workflow

1. **Make changes** to shared packages (types, branding, etc.)
2. **Rebuild** the package: `pnpm build --filter=@bondery/types`
3. **Restart** dependent apps (they auto-detect changes)

## 🌐 URL Structure

| Environment | Website | Webapp | API |
|-------------|---------|--------|-----|
| Development | localhost:3000 | localhost:3002 | localhost:3001 |
| Production | usebondery.com | app.usebondery.com | api.usebondery.com |

## 🔐 Authentication Flow

1. User visits website and clicks "Login"
2. Redirected to `app.usebondery.com/login`
3. OAuth login via GitHub/LinkedIn through Supabase
4. Supabase sets session cookies
5. Webapp makes API calls with cookies to server
6. Server validates session using `@supabase/ssr`

## 📊 API Endpoints

All API endpoints are served by the Fastify server at `api.usebondery.com`:

- `GET /api/contacts` - List contacts
- `GET /api/contacts/:id` - Get contact
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts` - Delete contacts
- `GET /api/account` - Get current user
- `PUT /api/account/photo` - Upload user photo
- `DELETE /api/account` - Delete account
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

## 🐛 Troubleshooting

### "Module not found" errors
```bash
# Rebuild shared packages
pnpm build --filter=@bondery/types
pnpm build --filter=@bondery/branding
```

### Port already in use
```bash
# Find process using port (PowerShell)
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
# Kill process
Stop-Process -Id <PID>
```

### API calls failing
- Check server is running on port 3001
- Verify environment variables are set
- Check Supabase credentials

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [apps/server/README.md](./apps/server/README.md) - Server API docs
- [apps/webapp/README.md](./apps/webapp/README.md) - Webapp docs
- [apps/website/README.md](./apps/website/README.md) - Website docs

## 🚢 Deployment

See deployment-specific READMEs:
- Vercel: [apps/website/README.md](./apps/website/README.md)
- Render/Railway: [apps/server/README.md](./apps/server/README.md)
- Vercel: [apps/webapp/README.md](./apps/webapp/README.md)

## 🆘 Need Help?

1. Check [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review app-specific READMEs
3. Open an issue on GitHub
