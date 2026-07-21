# Dokploy deployment (product Compose + ops website)

Canonical production topology — **two** Compose apps:

| Host | Service | Stack |
|------|---------|--------|
| `app.usebondery.com` | `webapp` :26632 | [`deploy/bondery`](../../deploy/bondery/) Compose |
| `api.usebondery.com` | `api` :26631 | same Compose file |
| (internal) | `redis` | same Compose — **never** attach a domain |
| `usebondery.com` | `website` :26630 | [`deploy/ops`](../../deploy/ops/) Compose (Bondery prod only) |

Self-hosters use **only** [`deploy/bondery`](../../deploy/bondery/) (api + webapp + redis). Marketing lives in ops and is not part of the self-host distribution. Quickstarts: [`deploy/bondery/README.md`](../../deploy/bondery/README.md) · [`deploy/ops/README.md`](../../deploy/ops/README.md).

## Product Compose application (`deploy/bondery`)

| Setting | Value |
|---------|-------|
| Provider | **Docker Compose** |
| Compose path | `deploy/bondery/docker-compose.yml` |
| Domains | Committed Traefik labels via `BONDERY_INFRA_WEBAPP_DOMAIN` / `BONDERY_INFRA_API_DOMAIN` (not Dokploy UI-only domains) |

### Environment

Copy [`deploy/bondery/.env.example`](../../deploy/bondery/.env.example) into Dokploy env (or a compose `.env`):

```env
BONDERY_INFRA_API_DOMAIN=api.usebondery.com
BONDERY_INFRA_WEBAPP_DOMAIN=app.usebondery.com
BONDERY_INFRA_WEBSITE_DOMAIN=usebondery.com
# Optional: omit image tags to use floating :production (or pin semver for rollback)
BONDERY_PRIVATE_REDIS_URL=redis://redis:6379
```

Plus API secrets and Supabase/`BONDERY_PUBLIC_*` from [`.env.example`](../../deploy/bondery/.env.example).

**Important:**

- Image tags: `production` (floating channel) is the default; pin semver when you want a fixed rollback target.
- Set hostnames only (`BONDERY_INFRA_API_DOMAIN`, `BONDERY_INFRA_WEBAPP_DOMAIN`, `BONDERY_INFRA_WEBSITE_DOMAIN`). Compose derives `https://…` URLs and Traefik `Host()` rules — do not set `BONDERY_PUBLIC_*_URL` in the stack `.env`.
- `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` must be **compact single-line JSON** (no newlines).
- Webapp never receives `PRIVATE_*` / `BONDERY_PRIVATE_*` — compose allowlists public vars only.
- Compose sets `BONDERY_INFRA_INTERNAL_API_URL=http://api:26631` for server-side fetches.

### Health checks

| Service | Liveness | Notes |
|---------|----------|--------|
| `webapp` | `GET /api/live` | Do **not** use `/api/status` (proxies API) |
| `webapp` readiness | `GET /api/ready` | Runtime config valid |
| `api` | `GET /status` | Process up |
| `api` deps | `GET /health` | Redis / Supabase / integrations |

### Isolated Deployments

Leave Dokploy **Isolated Deployments** off for the default Bondery app (one stack per host). Optional for operators running multiple Bondery instances on one Dokploy host — see Dokploy docs.

## Ops Compose application (`deploy/ops` — marketing website)

| Setting | Value |
|---------|-------|
| Provider | **Docker Compose** |
| Compose path | `deploy/ops/docker-compose.yml` |
| Image | `ghcr.io/usebondery/website:production` (hardcoded floating channel) |
| Domain | `BONDERY_INFRA_WEBSITE_DOMAIN` Traefik label → port `26630` |

**CI:** Push to the `release` branch (path-filtered) runs [`.github/workflows/deploy-website.yml`](../../.github/workflows/deploy-website.yml), which builds/pushes `:production` + `:sha-<short>`. No `website-X.Y.Z` tags. Optional Dokploy redeploy webhook: secret `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK`.

```env
BONDERY_INFRA_WEBAPP_DOMAIN=app.usebondery.com
BONDERY_INFRA_WEBSITE_DOMAIN=usebondery.com
```

Compose derives `BONDERY_PUBLIC_*_URL` from those domains. Health: `GET /api/live` (liveness), `GET /api/ready` (env valid).

**Cutover from Nixpacks:** stop the old Nixpacks/Railpack website app **before** deploying ops Compose (same Traefik Host). Details: [`deploy/ops/README.md`](../../deploy/ops/README.md).

## Webapp runtime config

The webapp exposes `GET /runtime-config.json` and injects `window.__BONDERY_RUNTIME_CONFIG__` during SSR — build once, deploy many.

Stack Compose sets public app URLs from domains. You still set Supabase (and optional PostHog) explicitly:

```env
BONDERY_PUBLIC_SUPABASE_URL=https://….supabase.co
BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

After changing domain or `BONDERY_PUBLIC_*` variables, **redeploy** the affected service(s) (no image rebuild for env-only changes).

## Supabase Auth URLs

In **Supabase → Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://app.usebondery.com` |
| **Redirect URLs** | `https://app.usebondery.com/**` |
| | `https://app.usebondery.com/auth/callback` |
| | `https://usebondery.com/auth/callback` (optional; forwards to webapp) |
| | Chrome extension `chromiumapp.org` URIs |

### GitHub OAuth app (Supabase provider)

Authorization callback URL must be the **Supabase** callback:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

### One Supabase project for API + webapp

Set `BONDERY_PUBLIC_SUPABASE_URL` and `BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY` once in the stack `.env`. Compose injects those into both services under the same `BONDERY_PUBLIC_*` names. The publishable key is designed to be public — sharing it is correct and expected.

## Environment migration (pre-1.7.x → `BONDERY_*`)

If the API container crashes with missing `NEXT_PUBLIC_*`, `PRIVATE_*`, or `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, you are on an **old API image** and/or still using **legacy env names**.

1. **Pin images** to `1.7.4` or newer (or redeploy after `:production` has moved past the env migration):
   ```env
   BONDERY_INFRA_API_IMAGE_TAG=1.7.4
   BONDERY_INFRA_WEBAPP_IMAGE_TAG=1.7.4
   ```
2. **Rename Dokploy / compose `.env` keys** (values stay the same):

   | Legacy | Current |
   |--------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `BONDERY_PUBLIC_SUPABASE_URL` |
   | `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | `PRIVATE_SUPABASE_SECRET_KEY` | `BONDERY_PRIVATE_SUPABASE_SECRET_KEY` |
   | `NEXT_PUBLIC_API_URL` | *(omit — derived from `BONDERY_INFRA_API_DOMAIN`)* |
   | `PRIVATE_API_KEY_PEPPER` | `BONDERY_PRIVATE_API_KEY_PEPPER` |
   | `PRIVATE_SUPABASE_JWT_SIGNING_JWK` | `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` |
   | `PRIVATE_EMAIL_HOST` | `BONDERY_PRIVATE_EMAIL_HOST` |
   | `PRIVATE_EMAIL_USER` | `BONDERY_PRIVATE_EMAIL_USER` |
   | `PRIVATE_EMAIL_PASS` | `BONDERY_PRIVATE_EMAIL_PASS` |
   | `PRIVATE_EMAIL_ADDRESS` | `BONDERY_PRIVATE_EMAIL_ADDRESS` |
   | `PRIVATE_EMAIL_PORT` | `BONDERY_PRIVATE_EMAIL_PORT` |

3. Copy the full template from [`deploy/bondery/.env.example`](../../deploy/bondery/.env.example), redeploy the stack, and pull fresh images (`docker compose pull` or Dokploy redeploy).

## Cutover (API-only Compose + separate webapp image → unified stack)

### Preflight

1. Record current image digests / env for API Compose and standalone webapp.
2. Keep the standalone webapp Dokploy app running as rollback until verified.
3. Redis volume continuity is optional (rate-limit / sync-wake / WS tickets only — disposable).

### Steps

1. Point the existing Compose app at `deploy/bondery/docker-compose.yml` (in-place preferred).
2. Set domains and secrets from `.env.example` (image tags optional — unset falls back to `:production`).
3. Deploy; wait until `redis` healthy and `api` `/status` OK.
4. Confirm Traefik routes: `api.usebondery.com` → `api:26631`, `app.usebondery.com` → `webapp:26632`. Do **not** route Redis.
5. Stop the old standalone webapp app if it conflicts on the domain.
6. Smoke: `curl` live/ready/status/health; login; one authenticated mutation; sync/WebSocket if used.

### Rollback

1. Re-point `app.usebondery.com` to the preserved standalone webapp image app.
2. Restore previous image tags or digests and redeploy.
3. A fresh Redis volume on rollback is acceptable.

### After 24–48h healthy bake

1. Remove the old Dokploy webapp Docker Image application.

## API with external Redis

Advanced: run the API image alone with managed Redis — see [api-container.md](./api-container.md).
