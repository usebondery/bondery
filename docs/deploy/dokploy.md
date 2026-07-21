# Dokploy deployment (product Compose + ops website)

Canonical production topology — **two** Compose apps:

| Host | Service | Stack |
|------|---------|--------|
| `app.usebondery.com` | `webapp` :26632 | [`deploy/bondery`](../../deploy/bondery/) Compose |
| `api.usebondery.com` | `api` :26631 | same Compose file |
| `supabase.usebondery.com` | `kong` :8000 | same Compose — bundled Supabase gateway |
| (internal) | `redis`, `db`, Auth, PostgREST, … | same Compose — **never** attach a domain |
| `usebondery.com` | `website` :26630 | [`deploy/ops`](../../deploy/ops/) Compose (Bondery prod only) |

Self-hosters use **only** [`deploy/bondery`](../../deploy/bondery/) (api + webapp + redis + Supabase). Marketing lives in ops and is not part of the self-host distribution. Guides: [`deploy/bondery/README.md`](../../deploy/bondery) · [`docs/deploy/self-host.md`](./self-host.md) · [`deploy/ops/README.md`](../../deploy/ops).

## Product Compose application (`deploy/bondery`)

| Setting | Value |
|---------|-------|
| Provider | **Docker Compose** |
| Compose path | `deploy/bondery/docker-compose.yml` (includes `docker-compose.supabase.yml`) |
| Domains | Traefik labels via `BONDERY_INFRA_WEBAPP_DOMAIN` / `BONDERY_INFRA_API_DOMAIN` / `BONDERY_INFRA_SUPABASE_DOMAIN` |

### Environment

Copy [`deploy/bondery/.env.example`](../../deploy/bondery/.env.example) into Dokploy env (or a compose `.env`):

```bash
BONDERY_INFRA_API_DOMAIN=api.usebondery.com
BONDERY_INFRA_WEBAPP_DOMAIN=app.usebondery.com
BONDERY_INFRA_WEBSITE_DOMAIN=usebondery.com
BONDERY_INFRA_SUPABASE_DOMAIN=supabase.usebondery.com
BONDERY_INFRA_CHROME_EXTENSION_ID=lpcmokfekjjejnpobhbkgmjkodfhpmha
BONDERY_PRIVATE_REDIS_URL=redis://redis:6379
```

Plus Postgres/Supabase secrets, API secrets, and OAuth vars from [`.env.example`](../../deploy/bondery/.env.example). First boot: `npm run stack:bootstrap:greenfield -w supabase-db`. Cloud migration: see [self-host cutover](./self-host.md#cutover-runbook-cloud--self-host).

**Important:**

- Image tags: `production` (floating channel) is the default; pin semver when you want a fixed rollback target.
- Set hostnames only (`BONDERY_INFRA_*_DOMAIN`). Compose derives `https://…` URLs and Traefik `Host()` rules — do **not** set `BONDERY_PUBLIC_SUPABASE_URL` (or other `BONDERY_PUBLIC_*_URL`) in the stack `.env`.
- `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` must be **compact single-line JSON** (no newlines).
- Webapp never receives `PRIVATE_*` / `BONDERY_PRIVATE_*` — compose allowlists public vars only.
- Compose sets `BONDERY_INFRA_INTERNAL_API_URL=http://api:26631` and `BONDERY_INFRA_INTERNAL_SUPABASE_URL=http://kong:8000`.
- Studio is opt-in: `docker compose --profile studio up -d studio` (SSH only; not Traefik).

### Health checks

| Service | Liveness | Notes |
|---------|----------|--------|
| `webapp` | `GET /api/live` | Do **not** use `/api/status` (proxies API) |
| `webapp` readiness | `GET /api/ready` | Runtime config valid |
| `api` | `GET /status` | Process up |
| `api` deps | `GET /health` | Redis / Supabase / integrations |
| `kong` | Compose healthcheck | api/webapp wait for `service_healthy` |

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

```bash
BONDERY_INFRA_WEBAPP_DOMAIN=app.usebondery.com
BONDERY_INFRA_WEBSITE_DOMAIN=usebondery.com
```

Compose derives `BONDERY_PUBLIC_*_URL` from those domains. Health: `GET /api/live` (liveness), `GET /api/ready` (env valid).

**Cutover from Nixpacks:** stop the old Nixpacks/Railpack website app **before** deploying ops Compose (same Traefik Host). Details: [`deploy/ops/README.md`](../../deploy/ops).

## Webapp runtime config

The webapp exposes `GET /runtime-config.json` and injects `window.__BONDERY_RUNTIME_CONFIG__` during SSR — build once, deploy many.

Stack Compose derives public app and Supabase URLs from domains. You still set Supabase **keys** (and optional PostHog) explicitly:

```bash
BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# BONDERY_PUBLIC_SUPABASE_URL is derived from BONDERY_INFRA_SUPABASE_DOMAIN
```

After changing domain or `BONDERY_PUBLIC_*` variables, **redeploy** the affected service(s) (no image rebuild for env-only changes).

## Supabase Auth URLs

Self-hosted GoTrue uses compose env (`GOTRUE_SITE_URL`, redirect allow-list). Equivalent settings:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://app.usebondery.com` (`BONDERY_INFRA_WEBAPP_DOMAIN`) |
| **Redirect URLs** | `BONDERY_SUPABASE_ADDITIONAL_REDIRECT_URLS` (app/site/mobile) |
| | Chrome extension: derived from `BONDERY_INFRA_CHROME_EXTENSION_ID` → `https://{id}.chromiumapp.org/` |

### GitHub / LinkedIn OAuth apps

Authorization callback URL must be the **bundled Supabase** callback:

```
https://supabase.usebondery.com/auth/v1/callback
```

(Replace host with your `BONDERY_INFRA_SUPABASE_DOMAIN`.)

### Keys for API + webapp

Set `BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and private secret / JWT vars) once in the stack `.env`. Compose derives `BONDERY_PUBLIC_SUPABASE_URL` from `BONDERY_INFRA_SUPABASE_DOMAIN` and injects into both services. The publishable key is designed to be public — sharing it is correct and expected.

## Environment migration (pre-1.7.x → `BONDERY_*`)

If the API container crashes with missing `NEXT_PUBLIC_*`, `PRIVATE_*`, or `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, you are on an **old API image** and/or still using **legacy env names**.

1. **Pin images** to `1.7.4` or newer (or redeploy after `:production` has moved past the env migration):
   ```bash
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
