# Plausible Community Edition (marketing analytics)

**Bondery production only** — self-hosted, cookieless analytics for the marketing website (`usebondery.com`). Not part of the self-host product (`deploy/bondery`) or the website container stack (`deploy/ops`).

Product analytics remain on PostHog in the webapp only.

## What this is

| Service               | Image                                        | Notes                    |
| --------------------- | -------------------------------------------- | ------------------------ |
| `plausible`           | `ghcr.io/plausible/community-edition:v3.2.1` | Web UI + event ingestion |
| `plausible_db`        | `postgres:16-alpine`                         | Metadata                 |
| `plausible_events_db` | `clickhouse/clickhouse-server:24.12-alpine`  | Event store              |

Expect **~2 GB RAM** for Postgres + ClickHouse + Plausible on a small VPS.

## Prerequisites

- Docker + Docker Compose
- DNS `A`/`AAAA` for `BONDERY_INFRA_PLAUSIBLE_DOMAIN` (default `plausible.usebondery.com`)
- `docker network create dokploy-network` (shared with `deploy/ops` Traefik)

## Quick start (Dokploy)

| Setting      | Value                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Provider     | **Docker Compose**                                                        |
| Compose path | `deploy/plausible/compose.yml`                                            |
| Domain       | `BONDERY_INFRA_PLAUSIBLE_DOMAIN` (Traefik labels in compose)              |
| Environment  | See [`deploy/plausible/.env.example`](.env.example)                       |
| Watch paths  | `deploy/plausible/**` (so git pushes and CI env-sync webhooks both match) |

Set these in Dokploy **Environment** (compose maps them to Plausible CE container env):

| Variable                                       | Example / generate                                     |
| ---------------------------------------------- | ------------------------------------------------------ |
| `BONDERY_INFRA_PLAUSIBLE_DOMAIN`               | `plausible.usebondery.com`                             |
| `BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE`    | `openssl rand -base64 48`                              |
| `BONDERY_PRIVATE_PLAUSIBLE_TOTP_VAULT_KEY`     | `openssl rand -base64 32`                              |
| `BONDERY_PRIVATE_PLAUSIBLE_POSTGRES_PASSWORD`  | `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |
| `BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION` | `invite_only` (optional)                               |

Compose derives `BASE_URL` as `https://<BONDERY_INFRA_PLAUSIBLE_DOMAIN>`.

## Infisical → Dokploy env sync

Plausible secrets and domain can be synced from Infisical **production** via [`.github/workflows/sync-dokploy-env.yml`](../../.github/workflows/sync-dokploy-env.yml) with `target: plausible`. Requires `BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID` (and optional `BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK`) in Infisical — see [workflows README](../../.github/workflows/README.md#dokploy-env-sync-sync-dokploy-envyml).

1. First run: `target: plausible`, `dry_run: true` — verify upload keys (Plausible env vars only, not `BONDERY_OPS_*` connection keys).
2. Backup Dokploy env before first live sync; `redeploy: true` restarts the plausible compose app only.

## Onboarding

1. Visit `https://<BONDERY_INFRA_PLAUSIBLE_DOMAIN>` and create the first admin user.
2. In Plausible, add a site: **`usebondery.com`** (must match the marketing hostname).
3. Keep `BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION=invite_only` after onboarding.

## Website integration

On the **ops** Dokploy app (`deploy/ops`), set `BONDERY_INFRA_WEBSITE_DOMAIN` and `BONDERY_INFRA_PLAUSIBLE_DOMAIN`. Compose derives:

- `BONDERY_PUBLIC_PLAUSIBLE_DOMAIN` from the marketing hostname (`BONDERY_INFRA_WEBSITE_DOMAIN`, e.g. `usebondery.com`) — this must match the site registered in Plausible
- `BONDERY_PUBLIC_PLAUSIBLE_HOST` from `https://` + the CE hostname (`BONDERY_INFRA_PLAUSIBLE_DOMAIN`)

## Upgrades

Pin the image tag in `compose.yml` and follow [Plausible CE upgrade notes](https://github.com/plausible/community-edition/wiki). Back up Postgres and ClickHouse volumes before upgrading.

## Security

- Do not expose Postgres or ClickHouse ports publicly.
- Keep `BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION=invite_only` in production after the first admin exists.
- Plausible admin is separate from Bondery product auth.
