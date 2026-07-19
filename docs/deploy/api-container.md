# API container (GHCR + external Redis)

CI builds and pushes the API image to GHCR.

**Canonical production and self-host path** is the unified stack:

→ [`deploy/bondery/`](../../deploy/bondery/) (webapp + API + Redis)  
→ [dokploy.md](./dokploy.md)

This document covers **image tagging**, **GHCR**, and the advanced API-alone deployment with external Redis.

**Current package:** `ghcr.io/usebondery/api`

> Older workflow runs may have published `ghcr.io/usebondery/bondery-api`. Use **`api`** going forward.

## Deployment options

- **Recommended:** [`deploy/bondery/docker-compose.yml`](../../deploy/bondery/docker-compose.yml) — webapp + API + bundled Redis.
- **Advanced:** API image alone + `BONDERY_PRIVATE_REDIS_URL` pointing to Redis you already operate.

- Bundled Redis default: `BONDERY_PRIVATE_REDIS_URL=redis://redis:6379` (compose service hostname).
- External Redis: set `BONDERY_PRIVATE_REDIS_URL` to your Redis; do **not** start the compose Redis service.
- Empty `BONDERY_PRIVATE_REDIS_URL` is **invalid in production**.

Local laptop Redis: [`apps/redis`](../../apps/redis/) (`npm run start -w redis`, port 26636) — not `deploy/bondery`.

## Tagging model

Three layers — do not confuse them:

| Layer | Example | Role |
|-------|---------|------|
| **Git tag** | `api-1.7.1` | Triggers the release workflow; appears in GitHub Releases |
| **Semver image tag** | `1.7.1` | Immutable artifact — **pin production via `BONDERY_INFRA_API_IMAGE_TAG`** |
| **Channel image tag** | `production`, `beta`, `sha-abc1234` | Floating or traceability tags |

### Published Docker tags

| Channel | CI trigger | Tags pushed | Use |
|---------|------------|-------------|-----|
| Integration | Push to `main` (API-related paths) | `beta`, `sha-<short-sha>` | Optional staging; rollback/debug on main |
| Production | Git tag `api-X.Y.Z` on `release` | `X.Y.Z`, `production` | Live API |

**Compose defaults:** omit `BONDERY_INFRA_*_IMAGE_TAG` (or leave unset) to pull the floating `production` channel. Pin semver when you want a fixed rollback target — see [`deploy/bondery/.env.example`](../../deploy/bondery/.env.example).

**No minor-line tags** (e.g. `1.7`) — only full `X.Y.Z` semver.

### Channel tag naming (`beta` vs alternatives)

| Tag | Who uses it | Fits Bondery? |
|-----|-------------|---------------|
| **`beta`** | Mobile/games, pre-release channels | OK if you run `beta.api.*` |
| **`staging`** | Most SaaS | Best if env is called “staging” |
| **`preview`** | Vercel-style per-change previews | Better for per-PR images |
| **`canary`** | Partial traffic rollouts | Different pattern |
| **`latest`** | Docker Hub defaults | Avoid |
| **`main` / `edge`** | GitOps | Fine if main == always deployable |

**Today:** workflow uses **`beta`** for the floating main build and **`production`** for the floating release build.

## GHCR package UI

### OS tab: `linux/amd64` and `unknown/unknown`

| OS | What it is |
|----|------------|
| **`linux/amd64`** | The runnable container image |
| **`unknown/unknown`** | BuildKit attestation metadata (not runnable) |

Workflows set `provenance: false` and `sbom: false` so future pushes only publish the runnable image.

### Platform

Images are **`linux/amd64` only** (Hetzner CX32).

## GitHub setup (one-time)

### Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `BONDERY_OPS_GHCR_WRITE_TOKEN` | Yes | Push images to GHCR (`docker login`) |
| `BONDERY_OPS_TURBO_TEAM` | Optional (GitHub **Actions variable**) | Turbo remote cache team |
| `BONDERY_OPS_TURBO_TOKEN` | Optional (secret) | Turbo remote cache |

### GHCR package visibility

Packages are **public** so self-hosters can pull without GitHub credentials.

### `release` branch

Production git tags must point at commits on `release`.

## Release process

1. Merge to `main` → integration image (`:beta`, `:sha-*`).
2. Promote + tag:

```bash
git checkout release
git merge origin/main
git push origin release
git tag api-1.7.1
git push origin api-1.7.1
```

3. CI publishes `ghcr.io/usebondery/api:1.7.1` and `:production`.
4. Bump `BONDERY_INFRA_API_IMAGE_TAG` (and tested `BONDERY_INFRA_WEBAPP_IMAGE_TAG` pair) in `deploy/bondery` / Dokploy and redeploy.

See [RELEASE.md](../../.agents/workflows/RELEASE.md) for the full stack pin workflow.

## Unified Compose

```bash
docker network create dokploy-network   # once
cd deploy/bondery
cp .env.example .env
# Fill secrets; pin BONDERY_INFRA_API_IMAGE_TAG / BONDERY_INFRA_WEBAPP_IMAGE_TAG to semver
docker compose up -d
```

Attach Traefik only via committed labels (`BONDERY_INFRA_API_DOMAIN` / `BONDERY_INFRA_WEBAPP_DOMAIN`). Never expose Redis.

Full Dokploy runbook: [dokploy.md](./dokploy.md).

## API image + external Redis

Use when Redis is already managed outside this stack.

### Dokploy — Docker Image fields

Use the **full image reference**. If you enter only `usebondery/api:production`, Docker pulls from **Docker Hub**, not GHCR.

| Field | Value |
|-------|--------|
| **Docker image** | `ghcr.io/usebondery/api:1.7.0` |
| **Registry URL** | leave empty, or `ghcr.io` if required |
| **Username / Password** | empty for public packages |
| **Container port** | `26631` |
| **Domain** | your API hostname |

Set `BONDERY_PRIVATE_REDIS_URL` to your Redis URL (`rediss://` when TLS is required). Do not leave it empty.

### Verify on the host

```bash
docker pull ghcr.io/usebondery/api:1.7.0
```

## Rollback

| Environment | Action |
|-------------|--------|
| Production (Compose) | Restore previous `BONDERY_INFRA_API_IMAGE_TAG` / `BONDERY_INFRA_WEBAPP_IMAGE_TAG` and redeploy changed services |
| Staging / main | Redeploy `:sha-<commit>` |

## Local smoke test

```bash
cd deploy/bondery && cp .env.example .env
# add secrets, then:
docker network create dokploy-network || true
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d

# Or build the API image locally (external Redis style)
docker build -f apps/api/Dockerfile -t api:local .
docker run --rm -p 26631:26631 --env-file apps/api/.env.production.local api:local
```

Boot validates required env via `assertRequiredEnvAtStartup` (same list as `npm run check-env -w api`) before Fastify listens.
