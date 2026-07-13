# API container deployment (GHCR + Dokploy)

CI builds and pushes container images to GHCR; Dokploy pulls and runs them.

**Current package:** `ghcr.io/usebondery/api`

> Older workflow runs may have published `ghcr.io/usebondery/bondery-api`. That is a separate GHCR package — use **`api`** going forward and retire `bondery-api` after cutover.

## Tagging model

Three layers — do not confuse them:

| Layer | Example | Role |
|-------|---------|------|
| **Git tag** | `api-1.7.1` | Triggers the release workflow; appears in GitHub Releases |
| **Semver image tag** | `1.7.1` | Immutable artifact — **pin production to this** |
| **Channel image tag** | `production`, `beta`, `sha-abc1234` | Floating or traceability tags (see below) |

### Published Docker tags

| Channel | CI trigger | Tags pushed | Use |
|---------|------------|-------------|-----|
| Integration | Push to `main` (API-related paths) | `beta`, `sha-<short-sha>` | Optional staging; rollback/debug on main |
| Production | Git tag `api-X.Y.Z` on `release` | `X.Y.Z`, `production` | Live `api.usebondery.com` |

**Production Dokploy:** pin `ghcr.io/usebondery/api:1.7.1` (semver). Use `:production` only if you want auto-deploy on every release.

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

## Dokploy — Docker provider fields

Use the **full image reference** in the Docker image field. If you enter only `usebondery/api:production`, Docker pulls from **Docker Hub** (`docker.io/usebondery/api`), not GHCR — that causes `repository does not exist or may require 'docker login'`.

### Production (public package, no registry login)

| Field | Value |
|-------|--------|
| **Docker image** | `ghcr.io/usebondery/api:1.7.0` or `ghcr.io/usebondery/api:production` |
| **Registry URL** | leave empty, or `ghcr.io` (only if your Dokploy version requires it) |
| **Username** | leave empty |
| **Password** | leave empty |

Pin **semver** (`:1.7.0`) for immutable prod; use `:production` only for floating latest release.

### If the package is still private (temporary)

| Field | Value |
|-------|--------|
| **Docker image** | `ghcr.io/usebondery/api:1.7.0` |
| **Registry URL** | `ghcr.io` |
| **Username** | GitHub username (PAT owner) |
| **Password** | Fine-grained PAT with **Packages → Read** |

### Legacy image (before package rename)

If **`api`** does not exist on GitHub Packages yet, the last successful build may be under the old name:

```text
ghcr.io/usebondery/bondery-api:prod
```

Switch to `ghcr.io/usebondery/api:…` after **API Image (Release)** succeeds with the current workflow.

### Verify on the Hetzner host before Dokploy

```bash
docker pull ghcr.io/usebondery/api:production
# or
docker pull ghcr.io/usebondery/bondery-api:prod
```

If both fail, the tag was never pushed or the package name differs — check **Actions** and **Packages** on GitHub.

## Dokploy — production app

| Setting | Value |
|---------|-------|
| Name | `api` |
| Provider | Docker Image |
| Image | `ghcr.io/usebondery/api:1.7.0` (full path — see above) |
| Container port | `26631` |
| Domain | `api.usebondery.com` |

```env
NODE_ENV=production
API_HOST=0.0.0.0
PORT=26631
NEXT_PUBLIC_API_URL=https://api.usebondery.com
NEXT_PUBLIC_WEBAPP_URL=https://app.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
```

Plus all `PRIVATE_*` from [`apps/api/.env.production.example`](../../apps/api/.env.production.example).

**Verify:**

```bash
curl https://api.usebondery.com/health
curl https://api.usebondery.com/status
```

## Dokploy — optional staging app

Skip this if you only run production.

| Setting | Value |
|---------|-------|
| Name | `api-staging` |
| Image | `ghcr.io/usebondery/api:beta` or `:sha-<commit>` |
| Domain | e.g. `staging.api.usebondery.com` |
| `NEXT_PUBLIC_API_URL` | matching staging URL |

## Rollback

| Environment | Action |
|-------------|--------|
| Production | Change image to previous semver (`1.7.0`) |
| Staging / main | Redeploy `:sha-<commit>` |

## Local smoke test

```bash
docker build -f apps/api/Dockerfile -t api:local .
docker run --rm -p 26631:26631 --env-file apps/api/.env.production.local api:local
```
