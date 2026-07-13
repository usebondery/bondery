# Dokploy deployment (webapp + website)

This doc covers the recommended Dokploy setup:

- **Webapp** (`app.usebondery.com`): deploy from a **prebuilt GHCR image** (no server builds)
- **Website** (`usebondery.com`): can stay on Nixpacks/Railpack (or migrate similarly later)

## Environment variables

### Webapp runtime config (build once, deploy many)

The webapp exposes `GET /runtime-config.json` and injects `window.__BONDERY_RUNTIME_CONFIG__` during SSR.
This allows the same webapp container image to be deployed across environments without rebuilding the client bundle.

Set **literal values** on the webapp service (container env at runtime — not baked into the image):

```env
BONDERY_PUBLIC_SUPABASE_URL=https://slusayyjuoxwoukhjjqh.supabase.co
BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
BONDERY_PUBLIC_WEBAPP_URL=https://app.usebondery.com
BONDERY_PUBLIC_WEBSITE_URL=https://usebondery.com
BONDERY_PUBLIC_API_URL=https://api.usebondery.com
```

Optional analytics:

```env
BONDERY_PUBLIC_POSTHOG_KEY=
BONDERY_PUBLIC_POSTHOG_HOST=
```

Use Dokploy **project** env vars for secrets consumed only at runtime (`PRIVATE_*` on API). Duplicate the public URLs on each Next.js app if needed — do not rely on `{{project.*}}` for `BONDERY_PUBLIC_*`.

After changing any `BONDERY_PUBLIC_*` variable, **redeploy** the webapp container (no image rebuild required).

**Migrate from old `NEXT_PUBLIC_*` names:** remove the old webapp env vars and add the `BONDERY_PUBLIC_*` equivalents (same values):

| Remove (old) | Add (new) |
|--------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `BONDERY_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `NEXT_PUBLIC_WEBAPP_URL` | `BONDERY_PUBLIC_WEBAPP_URL` |
| `NEXT_PUBLIC_WEBSITE_URL` | `BONDERY_PUBLIC_WEBSITE_URL` |
| `NEXT_PUBLIC_API_URL` | `BONDERY_PUBLIC_API_URL` |
| `NEXT_PUBLIC_POSTHOG_KEY` | `BONDERY_PUBLIC_POSTHOG_KEY` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `BONDERY_PUBLIC_POSTHOG_HOST` |

The container **fails on boot** if required vars are missing or still set to Docker build placeholders (e.g. `example.supabase.co`). Check logs if the service won't start after deploy.

Optional build metadata (surfaced via `/runtime-config.json`):

```env
BONDERY_VERSION=1.7.2
BONDERY_GIT_SHA=abcdef123456
```

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
| Provider | Docker Image |
| Image | `ghcr.io/usebondery/webapp:production` (floating) or `:X.Y.Z` (pin) |
| Registry URL | `ghcr.io` (optional; leave empty if Dokploy accepts full image ref) |
| Username | empty (public package) |
| Password | empty (public package) |
| Container port | `26632` |
| Domain | `app.usebondery.com` |

**Health checks:**

| Probe | Path | Purpose |
|-------|------|---------|
| Liveness | `GET /api/live` | Process is up (default Docker `HEALTHCHECK`) |
| Readiness | `GET /api/ready` | Runtime config is valid (optional in Dokploy) |

Do not point liveness at `/api/status` — that route proxies to the API and will mark the container unhealthy when the API is down, leaving the service at `0/1` and breaking Traefik DNS routing.

If GHCR packages are private, set Username to the PAT owner and Password to a fine-grained PAT with **Packages → Read**.

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

Login flow should start at `https://app.usebondery.com/login`. `usebondery.com/login` redirects to the webapp using the website's own `NEXT_PUBLIC_WEBAPP_URL` (website app — unchanged).

## API

See [api-container.md](./api-container.md) — API uses GHCR images, not Nixpacks.
