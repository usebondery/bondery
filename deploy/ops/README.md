# Bondery ops stack (marketing website)

**Bondery production only** — not part of the self-host product. Self-hosters use [`deploy/bondery`](../bondery/) (api + webapp + redis).

Docs: [docs/deploy/dokploy.md](../../docs/deploy/dokploy.md)

## What this is

| Service | Image | Port | Notes |
|---------|-------|------|--------|
| `website` | `ghcr.io/usebondery/website:production` | 26630 | Floating CD channel; liveness `/api/live`, readiness `/api/ready` |

## Continuous deploy

1. Merge website/marketing changes to `main`.
2. Promote: `git push origin main:release`.
3. [`.github/workflows/deploy-website.yml`](../../.github/workflows/deploy-website.yml) builds and pushes `:production` + `:sha-<short>`.
4. Dokploy pulls `:production` (`pull_policy: always`) — configure a redeploy webhook (`BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK`) or redeploy manually.

There are **no** `website-X.Y.Z` tags and **no** image-tag env var. Rollback by temporarily overriding the image to a known `:sha-<short>` or using Dokploy's previous deployment.

## Quick start (Dokploy)

| Setting | Value |
|---------|-------|
| Provider | **Docker Compose** |
| Compose path | `deploy/ops/docker-compose.yml` |
| Domain | `BONDERY_INFRA_WEBSITE_DOMAIN` (Traefik labels in compose) |

```bash
cd deploy/ops
cp .env.example .env
# Set BONDERY_INFRA_WEBAPP_DOMAIN + BONDERY_INFRA_WEBSITE_DOMAIN
docker compose up -d
```

Without Traefik (host port):

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
curl -s http://localhost:26630/api/live
curl -s http://localhost:26630/api/ready
```

Policy lint:

```bash
node deploy/ops/scripts/check-compose.mjs
```

## Cutover from Nixpacks

1. Wait until `ghcr.io/usebondery/website:production` exists (first successful `deploy-website` run).
2. **Stop** the old Nixpacks/Railpack website Dokploy app (avoid Traefik `Host()` collision on `usebondery.com`).
3. Create this Compose app, set `.env` domains, deploy.
4. Smoke: `/api/live`, `/api/ready`, home page, blog.
5. Optionally set `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` for automatic redeploys after release pushes.

## Security

- Website receives only public URL env vars (no API secrets).
- Do not attach Redis or other product services to this stack.
