# Dokploy deployment (webapp + website)

Apps deploy from the monorepo root via Nixpacks/Railpack and `turbo build --filter=<app>`.

## Environment variables

### `NEXT_PUBLIC_*` must be literal URLs at build time

Next.js inlines `NEXT_PUBLIC_*` during `next build`. Dokploy project references like `${{project.BONDERY_SUPABASE_URL}}` are **not** expanded reliably for client bundles — you may get the literal string or broken auth redirects.

Set **literal values** on each app (webapp, website):

```env
NEXT_PUBLIC_SUPABASE_URL=https://slusayyjuoxwoukhjjqh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_WEBAPP_URL=https://app.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
NEXT_PUBLIC_API_URL=https://api.usebondery.com
```

Use Dokploy **project** env vars for secrets consumed only at runtime (`PRIVATE_*` on API). Duplicate the public URLs on each Next.js app if needed — do not rely on `{{project.*}}` for `NEXT_PUBLIC_*`.

After changing any `NEXT_PUBLIC_*` variable, **rebuild** the app (clean build if unsure).

### Turbo remote cache (optional)

```env
TURBO_TEAM=your-vercel-team-slug
TURBO_TOKEN=your-remote-cache-token
```

## Website (marketing)

| Setting | Value |
|---------|-------|
| Build path | `.` (repo root) |
| Build | `npx turbo build --filter=website` |
| Start | `npx turbo start --filter=website` |
| Container port | `3000` |

## Webapp

| Setting | Value |
|---------|-------|
| Build path | `.` |
| Build | `npx turbo build --filter=webapp` |
| Start | `npx turbo start --filter=webapp` |
| Container port | `3000` |
| Domain | `app.usebondery.com` |

## Supabase Auth URLs

In **Supabase → Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://app.usebondery.com` |
| **Redirect URLs** | `https://app.usebondery.com/**` |
| | `https://app.usebondery.com/auth/callback` |
| | `https://usebondery.com/auth/callback` (optional; forwards to webapp) |
| | Chrome extension `chromiumapp.org` URIs |

If **Site URL** is still `http://localhost:3000`, OAuth falls back there when `redirectTo` is not allowed — that causes `https://localhost:3000/app` after GitHub login.

Login flow should start at `https://app.usebondery.com/login`. `usebondery.com/login` redirects to the webapp using `NEXT_PUBLIC_WEBAPP_URL`.

## API

See [api-container.md](./api-container.md) — API uses GHCR images, not Nixpacks.
