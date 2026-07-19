# API container deployment (GHCR + Compose + Dokploy)

CI builds and pushes the API image to GHCR. **Canonical production and self-host path** is Docker Compose: [`deploy/api/`](../../deploy/api/) (API + Redis). Dokploy should run that same stack.

**Current package:** `ghcr.io/usebondery/api`

> Older workflow runs may have published `ghcr.io/usebondery/bondery-api`. That is a separate GHCR package — use **`api`** going forward and retire `bondery-api` after cutover.

## Deploy paths

| Path | Stack | When |
|------|--------|------|
| **A (default)** | [`deploy/api/docker-compose.yml`](../../deploy/api/docker-compose.yml) — API + Redis | Self-hosters and Bondery production (Dokploy) |
| **B (advanced)** | API image alone + custom `PRIVATE_REDIS_URL` | You already operate Redis (managed / shared) |

- Path A default: `PRIVATE_REDIS_URL=redis://redis:6379` (compose service hostname).
- Path B: set `PRIVATE_REDIS_URL` to your Redis; do **not** start the compose Redis service.
- Empty `PRIVATE_REDIS_URL` is **invalid in production**.

Local laptop Redis: [`apps/redis`](../../apps/redis/) (`npm run start -w redis`, port 26636) — not `deploy/api`.

Quickstart: [`deploy/api/README.md`](../../deploy/api/README.md).

## Tagging model

Three layers — do not confuse them:

| Layer | Example | Role |
|-------|---------|------|
| **Git tag** | `api-1.7.1` | Triggers the release workflow; appears in GitHub Releases |
| **Semver image tag** | `1.7.1` | Immutable artifact — **pin production via `API_IMAGE_TAG`** |
| **Channel image tag** | `production`, `beta`, `sha-abc1234` | Floating or traceability tags (see below) |

### Published Docker tags

| Channel | CI trigger | Tags pushed | Use |
|---------|------------|-------------|-----|
| Integration | Push to `main` (API-related paths) | `beta`, `sha-<short-sha>` | Optional staging; rollback/debug on main |
| Production | Git tag `api-X.Y.Z` on `release` | `X.Y.Z`, `production` | Live `api.usebondery.com` |

**Production Compose:** set `API_IMAGE_TAG=1.7.1` (semver). Use `production` only if you want auto-float to the latest release tag.

**No minor-line tags** (e.g. `1.7`) — only full `X.Y.Z` semver.

### Channel tag naming (`beta` vs alternatives)

| Tag | Who uses it | Fits Bondery? |
|-----|-------------|---------------|
| **`beta`** | Mobile/games, pre-release channels | OK if you run `beta.api.*` |
| **`staging`** | Most SaaS (Stripe, Linear-style env names) | Best if env is called “staging” |
| **`preview`** | Vercel-style per-change previews | Better for per-PR images, not a single main head |
| **`canary`** | Partial traffic rollouts | Different pattern — not “latest main” |
| **`latest`** | Docker Hub defaults | Avoid — ambiguous and unsafe for prod |
| **`main` / `edge`** | GitOps / continuous deploy | Fine if main == always deployable |

**Today:** workflow uses **`beta`** for the floating main build and **`production`** for the floating release build. If you add a staging host, renaming `beta` → `staging` in the workflow is a one-line change; no industry standard is wrong here.

**If you skip staging entirely:** keep the workflow for CI smoke tests but only rely on `sha-*` tags (ignore `:beta`).

## GHCR package UI

### OS tab: `linux/amd64` and `unknown/unknown`

After a push you may see **two rows** under **OS** for the same version tag:

| OS | What it is |
|----|------------|
| **`linux/amd64`** | The runnable container image (what Dokploy pulls) |
| **`unknown/unknown`** | BuildKit **attestation/provenance** metadata (not a runnable image) |

GitHub attaches supply-chain attestations by default when using `docker/build-push-action`. They share the tag but are a separate manifest with no OS/arch — GHCR labels that **`unknown/unknown`**.

**Safe to ignore** for deploys. `docker pull ghcr.io/usebondery/api:1.7.1` resolves to the `linux/amd64` image.

Workflows set `provenance: false` and `sbom: false` so future pushes only publish the runnable image (cleaner package UI). Existing `unknown/unknown` entries remain until those tag digests are overwritten or the package is cleaned up.

### Which digest to use

- **Dokploy / runtime:** use the tag (`1.7.1`) or the **`linux/amd64`** digest.
- **Do not** deploy the `unknown/unknown` digest — it is attestation metadata, not your app.

### Platform

Images are built on `ubuntu-latest` → **`linux/amd64` only**. Hetzner CX32 is amd64 — no arm64 build today.

## GitHub setup (one-time)

### Secrets

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Required | Purpose |
|--------|----------|---------|
| `GHCR_WRITE_TOKEN` | Yes (org read-only `GITHUB_TOKEN`) | Push images to GHCR |
| `PRIVATE_TURBO_TEAM` | Optional | Turbo remote cache |
| `PRIVATE_TURBO_TOKEN` | Optional | Turbo remote cache |

`TURBO_TELEMETRY_DISABLED=1` is set in workflow YAML and the Dockerfile — not a secret.

### GHCR package visibility

Packages are **public** so self-hosters can pull without GitHub credentials.

To change visibility: `https://github.com/orgs/usebondery/packages` → **`api`** → **Package settings** → **Change visibility** → **Public**.

Link the package to this repository if prompted.

> Legacy package **`bondery-api`** may still exist from early CI runs. New releases publish to **`api`** only.

### `release` branch

Production git tags must point at commits on `release`:

```bash
git fetch origin release
git checkout release
git merge origin/main
git push origin release
```

## Release process

1. Merge to `main` → integration image updates (`:beta`, `:sha-*`).
2. Promote to production:

```bash
git checkout release
git merge origin/main
git push origin release
git tag api-1.7.1
git push origin api-1.7.1
```

3. CI publishes `ghcr.io/usebondery/api:1.7.1` and `ghcr.io/usebondery/api:production`.
4. On Dokploy Compose: bump `API_IMAGE_TAG` to the new semver and redeploy.

## Path A — Compose (canonical)

Self-hosters and Bondery production use the same file:

```bash
cd deploy/api
cp .env.example .env
# Fill secrets from apps/api/.env.production.example
# API_IMAGE_TAG=<semver>   PRIVATE_REDIS_URL=redis://redis:6379
docker compose up -d
curl -s http://localhost:26631/health
curl -s http://localhost:26631/status
```

| Service | Notes |
|---------|--------|
| `redis` | `redis:7-alpine`, AOF, volume `redis-data`, **no host ports** |
| `api` | GHCR image, port `26631`, waits for Redis healthy |

Attach reverse proxy / Traefik **only** to the `api` service (container port `26631`). Never expose Redis publicly.

### Dokploy — Compose application (production)

| Setting | Value |
|---------|-------|
| Name | `api` (or `api-compose`) |
| Provider | **Docker Compose** |
| Compose file | `deploy/api/docker-compose.yml` (repo) or pasted equivalent |
| Domain | `api.usebondery.com` on service **`api`**, port **`26631`** |

Environment (Dokploy env UI or `.env`):

```env
API_IMAGE_TAG=1.7.0
PRIVATE_REDIS_URL=redis://redis:6379
NODE_ENV=production
API_HOST=0.0.0.0
PORT=26631
NEXT_PUBLIC_API_URL=https://api.usebondery.com
NEXT_PUBLIC_WEBAPP_URL=https://app.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
```

Plus all remaining secrets from [`apps/api/.env.production.example`](../../apps/api/.env.production.example).

**Verify:**

```bash
curl https://api.usebondery.com/health
# expect services.redis.configured=true, services.redis.ok=true
curl https://api.usebondery.com/status
```

Future deploys: bump `API_IMAGE_TAG` and redeploy the Compose app (not a separate “Docker Image” provider).

### Dokploy migration (single image → Compose)

Goal: `api.usebondery.com` runs Path A — the same stack self-hosters run.

#### Preflight

1. Merge `deploy/api/` + docs; promote to `release` if that is your prod branch flow.
2. Choose pin: `API_IMAGE_TAG=<current-semver>` (prefer immutable semver over floating `production`).
3. Export all current Dokploy API env vars (`PRIVATE_*`, `NEXT_PUBLIC_*`, etc.).
4. Schedule a short window — WebSocket / sync wake interrupt briefly during cutover.

#### Cutover

1. Create a **new** Dokploy Compose application (keep the old Docker Image app until verified).
2. Point it at `deploy/api/docker-compose.yml`.
3. Paste secrets + `PRIVATE_REDIS_URL=redis://redis:6379` + `API_IMAGE_TAG=<semver>`.
4. Attach `api.usebondery.com` / Traefik to service **`api`** only (`26631`). Do not publish Redis.
5. Deploy; wait until Redis is healthy and API is listening.
6. Verify health/status (commands above); smoke webapp login + one API mutation.
7. Stop/remove the old single-image API app so only Compose remains.
8. Ops note: upgrades = bump `API_IMAGE_TAG` + Compose redeploy.

#### Rollback

1. Re-point the domain to the previous Docker Image app (prior image tag + prior `PRIVATE_REDIS_URL` if any).
2. Stop the Compose app.
3. Inspect Compose logs (`api`, `redis`) before retrying.

#### Post-migration

- Redis data is in volume `redis-data` — survives API image upgrades; back up via volume snapshot / Dokploy volume backup when available.
- Bondery production stays on Path A; Path B remains for other operators only.

## Path B — API image + external Redis

Use when Redis is already managed outside this stack.

### Dokploy — Docker Image fields

Use the **full image reference**. If you enter only `usebondery/api:production`, Docker pulls from **Docker Hub**, not GHCR.

| Field | Value |
|-------|--------|
| **Docker image** | `ghcr.io/usebondery/api:1.7.0` (full path) |
| **Registry URL** | leave empty, or `ghcr.io` if required |
| **Username / Password** | empty for public packages |
| **Container port** | `26631` |
| **Domain** | your API hostname |

Set `PRIVATE_REDIS_URL` to your Redis URL (TLS `rediss://` when required). Do not leave it empty.

### If the package is still private (temporary)

| Field | Value |
|-------|--------|
| **Docker image** | `ghcr.io/usebondery/api:1.7.0` |
| **Registry URL** | `ghcr.io` |
| **Username** | GitHub username (PAT owner) |
| **Password** | Fine-grained PAT with **Packages → Read** |

### Legacy image (before package rename)

```text
ghcr.io/usebondery/bondery-api:prod
```

Switch to `ghcr.io/usebondery/api:…` after **Release - API** succeeds with the current workflow.

### Verify on the Hetzner host

```bash
docker pull ghcr.io/usebondery/api:production
```

If pull fails, check **Actions** and **Packages** on GitHub.

## Dokploy — optional staging (Compose or image)

| Setting | Value |
|---------|-------|
| Name | `api-staging` |
| Image / tag | `API_IMAGE_TAG=beta` or `:sha-<commit>` |
| Domain | e.g. `staging.api.usebondery.com` |
| `NEXT_PUBLIC_API_URL` | matching staging URL |

Prefer the same Compose file as production with staging env values.

## Rollback

| Environment | Action |
|-------------|--------|
| Production (Compose) | Set `API_IMAGE_TAG` to previous semver and redeploy; or restore previous Docker Image app (see migration rollback) |
| Staging / main | Redeploy `:sha-<commit>` |

## Local smoke test

```bash
# Compose Path A (needs a filled .env)
cd deploy/api && cp .env.example .env
# add secrets, then:
docker compose up -d

# Or build the API image locally (Path B style)
docker build -f apps/api/Dockerfile -t api:local .
docker run --rm -p 26631:26631 --env-file apps/api/.env.production.local api:local
```
