# Bondery ops stack (marketing website)

**Bondery production only** — not part of the self-host product. Self-hosters use [`deploy/bondery`](../bondery/) (api + webapp + redis + Postgres + SeaweedFS).

Docs: [docs/contributing/dokploy.mdx](../../docs/contributing/dokploy.mdx)

## What this is

| Service | Image | Port | Notes |
|---------|-------|------|--------|
| `website` | `ghcr.io/usebondery/website:${BONDERY_INFRA_WEBSITE_IMAGE_TAG:-production}` | 26630 | Floating `:production` by default; liveness `/health/live`, readiness `/health/ready` |

Traefik router names and the Docker DNS alias are `${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}-website`. Default prefix is `bondery`; beta uses `bondery-beta`. Production and beta share `dokploy-network`. Leave Dokploy **Isolated Deployments** off.

Two Compose apps, same file:

| Stack | Hostname | Image pin (Dokploy UI) | Dokploy branch |
|-------|----------|------------------------|----------------|
| Production | `usebondery.com` | `BONDERY_INFRA_WEBSITE_IMAGE_TAG=production` (Infisical production → `website` sync; omit for compose default `:production`) | `release` |
| Beta | `beta.usebondery.com` | `BONDERY_INFRA_WEBSITE_IMAGE_TAG=beta` (Infisical staging → `website-beta` sync) | `main` |

**Hard gate:** Redeploy production with this prefixed compose **before** creating the second app. Same Traefik router names on one Traefik overwrite production HTTPS routes.

## Continuous deploy

1. Merge website/marketing changes to `main` (PRs run path-filtered `website-build` in [`.github/workflows/verify.yml`](../../.github/workflows/verify.yml) — pruned `turbo build --filter=website`, same recipe as Docker).
2. [`stage-images.yml`](../../.github/workflows/stage-images.yml) on `main` tags website `:beta` + `:sha-<short>` and notifies the staging website webhook (`refs/heads/main`) when set.
3. Promote production: `git push origin main:release`.
4. [`.github/workflows/deploy-website.yml`](../../.github/workflows/deploy-website.yml) builds the Docker image and pushes `:production` + `:sha-<short>` (no separate host gate; release smoke validates the image). Production CD stays on this workflow — it does not learn about beta.
5. Dokploy pulls `:production` (`pull_policy: always`) — configure a redeploy webhook (`BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` in Infisical production) or redeploy manually. In Dokploy, set the production Compose app branch to **`release`** (CI always sends `refs/heads/release` in the webhook payload, including manual workflow runs). Set the beta app branch to **`main`**.

Host CI and production images pin Node 26 (`.nvmrc` / `node:26-slim`). Dependencies use pnpm 12.6.0. Release `smoke` validates the production container runtime.

There are **no** `website-X.Y.Z` release tags. Pin `BONDERY_INFRA_WEBSITE_IMAGE_TAG` to a semver or `:sha-<short>` for rollback. Infisical production: `production` (or omit for floating `:production`). Infisical staging: `beta`. Both sync to their Dokploy website apps.

## Quick start (Dokploy)

| Setting | Value |
|---------|-------|
| Provider | **Docker Compose** |
| Compose path | `deploy/ops/docker-compose.yml` |
| Domain | `BONDERY_INFRA_WEBSITE_DOMAIN` (Traefik labels in compose) |

```bash
cd deploy/ops
cp .env.example .env   # generated from manifest (opsExample metadata)
# Set BONDERY_INFRA_WEBAPP_DOMAIN + BONDERY_INFRA_WEBSITE_DOMAIN
docker compose up -d
```

Without Traefik (host port):

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
curl -s http://localhost:26630/health/live
curl -s http://localhost:26630/health/ready
```

Policy lint:

```bash
node deploy/ops/scripts/check-compose.mjs
```

## Cutover from Nixpacks

1. Wait until `ghcr.io/usebondery/website:production` exists (first successful `deploy-website` run).
2. **Stop** the old Nixpacks/Railpack website Dokploy app (avoid Traefik `Host()` collision on `usebondery.com`).
3. Create this Compose app, set `.env` domains, deploy.
4. Smoke: `/health/live`, `/health/ready`, home page, blog.
5. Optionally set `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` in Infisical production for automatic redeploys after release pushes.

## Infisical → Dokploy env sync

Domain hostnames (and `BONDERY_INFRA_TRAEFIK_PREFIX` when set) can be synced from Infisical to the website Dokploy app via [`.github/workflows/sync-dokploy-env.yml`](../../.github/workflows/sync-dokploy-env.yml):

- **Production:** `deployment: production`, `target: website`.
- **Beta:** `deployment: beta`, `target: website` → `website-beta`. Infisical **production** keys: `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID` and optional `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK`.

Dokploy API creds and optional redeploy webhooks are stored in Infisical (not GitHub secrets).

**Not synced** (keep in Dokploy UI): `BONDERY_INFRA_GIT_SHA`, `BONDERY_INFRA_VERSION`. `BONDERY_INFRA_WEBSITE_IMAGE_TAG` syncs from Infisical (`production` or omit in production, `beta` in staging).

Staging Infisical (beta app secrets): `BONDERY_INFRA_WEBSITE_DOMAIN=beta.usebondery.com`, `BONDERY_INFRA_WEBAPP_DOMAIN=app.beta.usebondery.com`, `BONDERY_INFRA_TRAEFIK_PREFIX=bondery-beta`, `BONDERY_INFRA_WEBSITE_IMAGE_TAG=beta`.

Plausible: one CE. Register the beta marketing hostname as a second site — do not clone the Plausible stack.

1. Add website keys under `bondery-secrets` → `production` / `staging` → `/` (see [workflows README](../../.github/workflows/README.md#dokploy-env-sync-sync-dokploy-envyml)).
2. Grant OIDC identity read on production; extend subject for `sync-dokploy-env.yml`.
3. First run: `target: website`, `dry_run: true` → confirm upload keys.
4. Backup Dokploy env; run `dry_run: false`.

Plausible CE secrets sync to a **separate** Dokploy compose app — see [`deploy/plausible/README.md`](../plausible/README.md).

## Security

- Website receives only public URL env vars (no API secrets).
- Do not attach Redis or other product services to this stack.
