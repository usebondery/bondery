# Bondery stack (webapp + API + Redis + Postgres + SeaweedFS)

Canonical Docker Compose distribution for **self-hosters** and **Bondery production** (Dokploy).

The marketing website is **not** in this stack — see [`deploy/ops`](../ops/) (Bondery production only). This folder still uses `BONDERY_INFRA_WEBSITE_DOMAIN` so api/webapp can derive `BONDERY_PUBLIC_WEBSITE_URL`.

Local development:

- Redis: **`deploy/bondery/docker-compose.dev-redis.yml`** (`pnpm run start:redis`, port 26636, mutual TLS like the stack; secrets in `.temp/redis-secrets`)
- Postgres: **`deploy/bondery/docker-compose.dev-db.yml`** or `packages/db` migrations — not this Compose file

Docs: [docs/deploy/installation.mdx](../../docs/deploy/installation.mdx) · [docs/deploy/configuration.mdx](../../docs/deploy/configuration.mdx) · [docs/contributing/dokploy.mdx](../../docs/contributing/dokploy.mdx)

## Quick start

```bash
# One-time: shared Traefik network (Dokploy creates this; self-hosters create it once)
docker network create dokploy-network

cd deploy/bondery
cp .env.example .env
# Fill domains + secrets (see docs/deploy/installation.mdx)
docker compose up -d
```

`deploy/bondery/.env.example` is **generated** from [`packages/helpers/src/env/manifest.ts`](../../packages/helpers/src/env/manifest.ts) (`deployExample` metadata). After changing deploy env vars in the manifest, run `pnpm run env -- --write-examples`.

Requires Docker Compose **v2.38+** (`pre_start` on `api`). First boot applies migrations, OAuth provisioning, and SeaweedFS buckets automatically via `api` init containers — no manual steps.

Without Traefik (Caddy or nginx on the same host). The override turns off `traefik-transport` and binds the stack ports to `127.0.0.1` only:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
sh scripts/api-ca.sh > api-ca.crt                            # CA of the API's HTTPS listener (26631)
sh scripts/storage-ca.sh --client-dir ./bondery-storage       # storage CA + client certificate (8443)
curl -s --cacert api-ca.crt https://127.0.0.1:26631/health/live
curl -s http://127.0.0.1:26632/health/live
```

The storage gateway refuses a caller without a client certificate, so your proxy needs the whole `bondery-storage` directory, not only its `ca.crt`. Point your proxy at those ports with [`proxy/Caddyfile`](proxy/Caddyfile) or [`proxy/nginx.conf`](proxy/nginx.conf). Another Traefik (Coolify): keep the job and set `BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR` instead. Details: [Reverse proxy](../../docs/deploy/reverse-proxy.mdx).

### Services

| Service             | Image                       | Port                      | Notes                                                                                                                                                                                                                       |
| ------------------- | --------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webapp`            | `ghcr.io/usebondery/webapp` | 26632                     | Liveness `/health/live`                                                                                                                                                                                                     |
| `api`               | `ghcr.io/usebondery/api`    | 26631 HTTPS               | Better Auth + Prisma; waits for Redis + Postgres + SeaweedFS                                                                                                                                                                |
| `redis`             | `redis:8.10`                | internal                  | Mutual TLS + password. AOF + volume `redis-data`                                                                                                                                                                            |
| `stack-secrets`     | `ghcr.io/usebondery/api`    | none                      | One-shot. Creates the Redis CA and certificates (`redis-tls-*` volumes), and the Postgres, storage, and API CAs and certificates, when missing                                                                              |
| `traefik-transport` | `busybox:1.37`              | none                      | One-shot. Writes `${prefix}-api-transport.yml` and `-storage-transport.yml` (the CAs) into Traefik's folder (Dokploy's, or `BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR`), so Traefik reaches the API and storage over verified HTTPS |
| `db`                | `postgis/postgis:17-3.5`    | `127.0.0.1:5432`          | Named volume `postgres-data`. Loopback only (SSH tunnels). Second stack: `BONDERY_INFRA_POSTGRES_HOST_PORT=5433`                                                                                                            |
| `seaweedfs-*`       | SeaweedFS                   | 8443 HTTPS (API, Traefik) | S3 creds from `.env` → rendered at startup (`seaweedfs/entrypoint.sh`). Mutual TLS between nodes (`seaweedfs/security.toml`)                                                                                                |

Compose entrypoint: **`docker-compose.yml`** includes **`docker-compose.postgres.yml`** and **`docker-compose.seaweedfs.yml`**. Dokploy points at this path only.

### Networking

- `webapp`, `api`, and `seaweedfs-s3` join external `dokploy-network` (Traefik). Postgres, Redis, and the SeaweedFS cluster (master / volume / filer) stay on private `internal`.
- Every service publishes `${BONDERY_INFRA_TRAEFIK_PREFIX}-{api|webapp|storage|db|redis|…}`. Look those names up — never the Compose service names `api`, `webapp`, or `seaweedfs-s3` (they collide when production and beta share `dokploy-network`).
- Set hostnames (`BONDERY_INFRA_*_DOMAIN`); Compose derives `https://…` URLs.
- Webapp SSR uses `BONDERY_INFRA_INTERNAL_API_URL=https://${BONDERY_INFRA_TRAEFIK_PREFIX}-api:26631`, the API's HTTPS listener (its only one), and trusts the API CA (`BONDERY_INFRA_INTERNAL_API_CA_FILE`). Traefik forwards to the same HTTPS port `26631` and verifies it with the published transport; there is no plaintext port.
- API storage uses `BONDERY_PRIVATE_S3_ENDPOINT=https://${BONDERY_INFRA_TRAEFIK_PREFIX}-storage:8443` and trusts the storage CA (`BONDERY_PRIVATE_S3_TLS_CA_FILE`).

### Upgrades / rollback

Pin `BONDERY_INFRA_VERSION` to move **api and webapp together** (coordinated deploy). Roll back by setting the previous semver and redeploying the full product stack:

```bash
BONDERY_INFRA_VERSION=1.7.3 docker compose up -d api webapp
```

Do not upgrade or roll back api/webapp independently in production — contract changes ship as a pair.

Schema migrations run automatically via `api` `pre_start` on deploy — no separate `db:migrate:deploy` step for Compose deployments.

### CI redeploy webhook (Bondery production)

After `vX.Y.Z` release tags: GitHub Actions promotes the semver images, runs ONE compose smoke for api and webapp together, and moves `:production` only for a release that passed. It then fetches **production Infisical**, sets `BONDERY_INFRA_VERSION=X.Y.Z` on the Dokploy Compose app through the Dokploy API, and calls `BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK` with `refs/heads/release`. The deploy runs only when every component of the release is ready, and it runs the pinned version, not the floating `:production` tag. Configure the Dokploy Compose app branch to **`release`**. See [dokploy.mdx](../../docs/contributing/dokploy.mdx).

### Infisical → Dokploy env sync

Product stack secrets and hostnames can be synced via [`.github/workflows/sync-dokploy-env.yml`](../../.github/workflows/sync-dokploy-env.yml):

- **Production:** `deployment: production`, `target: services` — Infisical production; requires `BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID` (and optional `BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK`).
- **Beta:** `deployment: beta`, `target: services` — Infisical **staging** app secrets + production ops keys; requires `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID` and optional `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK` in Infisical **production**.

See [workflows README](../../.github/workflows/README.md#dokploy-env-sync-sync-dokploy-envyml).

**Not synced** (keep in Dokploy UI or compose derives): `BONDERY_INFRA_GIT_SHA`, `BONDERY_INFRA_VERSION`, `BONDERY_PRIVATE_S3_ENDPOINT`, `BONDERY_PUBLIC_STORAGE_URL`. `BONDERY_INFRA_TRAEFIK_PREFIX` syncs from Infisical (`bondery` in production, `bondery-beta` in staging). `BONDERY_INFRA_POSTGRES_HOST_PORT` syncs when set (omit in production; Infisical staging should be `5433`).

### Release smoke (local)

Reproduce the CI release smoke against a pulled GHCR tag. It starts api and webapp at that tag together, runs a real Traefik (the version Dokploy runs) on a root-owned fixture folder, and sends requests for the api and storage domains through it. It needs Docker, and it publishes ports `26631`, `26632`, `8333`, and `54322` on the host, so stop other Bondery stacks first and do not run it next to a dev stack:

```bash
docker network create dokploy-network || true
# docker login ghcr.io  # when pulling private images
node deploy/bondery/scripts/smoke-release.mjs --tag 1.7.5
```

### Image tags (api / webapp)

- **Compose default:** the production `X.Y.Z` of the release that ships the compose file. `sync-version` stamps it, so a checkout of `vX.Y.Z` runs `X.Y.Z`.
- **Production Dokploy:** the release workflow sets `BONDERY_INFRA_VERSION=X.Y.Z` before it redeploys. Never rely on the floating `:production` tag for a deploy: it moves per component.
- **`beta`:** set `BONDERY_INFRA_VERSION=beta` on the staging Dokploy app so it tracks `:beta`. `:beta` moves only after an RC passed the same release smoke.
- **Semver:** pin for frozen rollback.

A second stack on the same Traefik must set `BONDERY_INFRA_TRAEFIK_PREFIX=bondery-beta` in Infisical **staging** (beta sync). Infisical **production** should be `bondery` or omitted (compose default). Same router names on one Traefik overwrite production HTTPS routes. The same-host beta stack must also set `BONDERY_INFRA_POSTGRES_HOST_PORT=5433` so it does not steal production's `127.0.0.1:5432`.

## Advanced: external Postgres

Redis is always the bundled service. Compose sets every Redis variable, so an operator value in `.env` has no effect. Run the full stack instead of the API image alone. To use a managed Postgres, add the `docker-compose.external-postgres.yml` overlay (see [Configuration](../../docs/deploy/configuration.mdx#postgres-tls)).

## Security

- Redis requires mutual TLS and a password. `stack-secrets` creates the `redis-tls-ca`, `redis-tls-server`, and `redis-tls-client` volumes on first start; rotation: [docs/deploy/secrets.mdx](../../docs/deploy/secrets.mdx#redis_password_and_certificate).
- Never expose Redis or Postgres to the public internet. Compose publishes Postgres on `127.0.0.1` only; do not change that bind to `0.0.0.0`.
- API secrets (`BONDERY_PRIVATE_*`) load only into the `api` service (`env_file`). Webapp receives an explicit allowlist.

## Resource limits (recommended)

On a **8 GB VPS** (recommended self-host profile), add `deploy.resources` to cap noisy neighbors. Tune for your host — these are starting points, not guarantees under Docker Compose without Swarm:

```yaml
# Example overrides — merge into docker-compose.override.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          memory: 512M
  webapp:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
  db:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 3G
        reservations:
          memory: 1G
  redis:
    deploy:
      resources:
        limits:
          memory: 256M
```

SeaweedFS (`seaweedfs-*`) is I/O-heavy — allow 512M–1G per component on storage-heavy installs.

Requires Docker Compose **v2.38+** (`api` `pre_start`). CI enforces this via `node deploy/bondery/scripts/check-compose.mjs`.
