# Migration Checklist

## ✅ Completed

### Core Infrastructure
- [x] Created `packages/types` with shared TypeScript types
- [x] Created `apps/server` Fastify API server
- [x] Created `apps/website` Next.js landing page
- [x] Created `apps/webapp` Next.js authenticated app
- [x] Updated `turbo.json` with new apps and dependencies
- [x] Created comprehensive documentation

### Packages
- [x] `@bondery/types` - Contact, UserSettings, Database types
- [x] `@bondery/branding` - Logo, theme (already existed)
- [x] `@bondery/helpers` - Utilities (already existed)
- [x] `@bondery/translations` - i18n (already existed)

### Server (apps/server)
- [x] Package.json with Fastify dependencies
- [x] TypeScript configuration
- [x] Supabase client setup
- [x] Configuration (API_URL, APP_URL, WEBSITE_URL)
- [x] Routes: contacts, account, settings, redirect
- [x] CORS configuration for webapp/website
- [x] Cookie-based auth validation
- [x] File upload support (multipart)
- [x] README with API documentation
- [x] Environment variables example

### Website (apps/website)
- [x] Package.json with Next.js dependencies
- [x] TypeScript & PostCSS configuration
- [x] App layout with Mantine providers
- [x] Landing page components (Hero, Features, Pricing, etc.)
- [x] Contact and status pages
- [x] i18n setup with next-intl
- [x] Redirects to webapp for /login and /app/*
- [x] README with deployment info
- [x] Environment variables example

### Webapp (apps/webapp)
- [x] Package.json with all dependencies
- [x] TypeScript & PostCSS configuration
- [x] App structure with route groups
- [x] Root layout with Mantine providers
- [x] Login page with OAuth
- [x] Auth callback handler
- [x] Relationships page with ContactsTable
- [x] Settings page with all components
- [x] Person detail page
- [x] Navigation sidebar
- [x] All shared components copied
- [x] All lib utilities copied
- [x] Public assets (logo.svg, icons)
- [x] API rewrites to server
- [x] Supabase client setup
- [x] README with setup instructions
- [x] Environment variables example

### Configuration Files
- [x] turbo.json updated with new apps
- [x] ARCHITECTURE.md created
- [x] SETUP.md created
- [x] README.md updated
- [x] .env.development.example for each app

## 📋 Next Steps

### 1. Setup Environment Variables
```bash
# Copy example files and fill in your values
cp apps/webapp/.env.development.example apps/webapp/.env.development.local
cp apps/server/.env.development.example apps/server/.env.development.local
cp apps/website/.env.development.example apps/website/.env.development.local
```

### 2. Build Shared Packages
```bash
pnpm build --filter=@bondery/types
pnpm build --filter=@bondery/branding
pnpm build --filter=@bondery/helpers
pnpm build --filter=@bondery/translations
```

### 3. Test Each App
```bash
# Test server
pnpm dev --filter=server

# Test website
pnpm dev --filter=website

# Test webapp
pnpm dev --filter=webapp

# Test all together
pnpm dev
```

### 4. Verify Functionality
- [ ] Website landing page loads at localhost:3000
- [ ] Server API responds at localhost:3001/api/contacts
- [ ] Webapp loads at localhost:3002
- [ ] Login flow works (OAuth → Supabase → Webapp)
- [ ] API calls from webapp to server work
- [ ] Cookies are properly validated by server
- [ ] Contacts CRUD operations work
- [ ] Settings page works
- [ ] Person detail page works

### 5. Clean Up (Optional)
Once verified working:
```bash
# Archive or remove the old apps/web folder
mv apps/web apps/web.backup
# or
rm -rf apps/web
```

### 6. Update CI/CD
- [ ] Update deployment workflows for 3 separate apps
- [ ] Configure environment variables in hosting platforms
- [ ] Set up domains: usebondery.com, app.usebondery.com, api.usebondery.com
- [ ] Test production builds

### 7. Database Migrations
- [ ] Verify Supabase schema is up to date
- [ ] Test RLS policies work with new server
- [ ] Backup database before migration

## 🐛 Troubleshooting

### Module not found errors
```bash
pnpm build --filter=@bondery/types
pnpm build --filter=@bondery/branding
```

### Port conflicts
```powershell
# Check what's using the port
Get-NetTCPConnection -LocalPort 3001
# Kill the process
Stop-Process -Id <PID>
```

### API calls failing
1. Check server is running on port 3001
2. Verify NEXT_PUBLIC_API_URL in webapp .env
3. Check CORS settings in server
4. Verify Supabase credentials

### Authentication issues
1. Check Supabase OAuth providers are configured
2. Verify redirect URLs in Supabase dashboard
3. Check environment variables (client ID/secret)
4. Clear browser cookies and try again

## 📝 Notes

- The original `apps/web` is still present and can be used as reference
- All imports using `@/` should work in the new structure
- Types are now shared via `@bondery/types` package
- API calls go through Next.js rewrites to the Fastify server
- Authentication uses Supabase SSR with cookie validation
