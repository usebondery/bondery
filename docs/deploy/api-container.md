# API container deployment (GHCR + Dokploy)

This guide covers the manual setup for the API Docker pipeline. CI builds and pushes images automatically; Dokploy pulls and runs them.

## Image tags

| Channel | Trigger | GHCR tags |
|---------|---------|-----------|
| Beta | Push to `main` (API-related paths) | `beta`, `sha-<commit>` |
| Production | Tag `api-vX.Y.Z` on `release` branch | `X.Y.Z`, `X.Y`, `prod` |

Image: `ghcr.io/usebondery/bondery-api`

## GitHub setup (one-time)

### 1. Actions workflow permissions

Repo → **Settings** → **Actions** → **General** → **Workflow permissions**

- Select **Read and write permissions**
- Enable **Allow GitHub Actions to create and approve pull requests** (optional)

If org policy disables **Read and write permissions** for `GITHUB_TOKEN`, add a repo secret:

| Secret | Value |
|--------|--------|
| `GHCR_WRITE_TOKEN` | Fine-grained PAT with **Packages → Read and write** on `usebondery/bondery` |

Workflows push to GHCR with that token (username = org owner `usebondery`).

### 2. Branch protection on `main`

Repo → **Settings** → **Branches** → add rule for `main`:

- Require status check: **CI** (`.github/workflows/ci.yml`)
- Require pull request before merging (recommended)

The beta image workflow runs API smoke tests before push, but PR CI should gate merges.

### 3. GHCR package visibility

After the first successful workflow run:

1. Open `https://github.com/orgs/usebondery/packages`
2. Select **bondery-api**
3. **Package settings** → set visibility to **Private** (recommended)
4. Link the package to this repository if prompted

### 4. `release` branch

Production tags must point at commits on `release`:

```bash
git fetch origin release
git checkout release
git merge origin/main
git push origin release
```

## Release process

1. Merge features into `main` → beta image updates automatically (`:beta`).
2. Promote to production:

```bash
git checkout release
git merge origin/main
# Bump apps/api/package.json version if needed
git push origin release
git tag api-v1.7.0
git push origin api-v1.7.0
```

3. GitHub Actions publishes `ghcr.io/usebondery/bondery-api:1.7.0` and creates a GitHub Release.

Pin production Dokploy to the semver tag, not `:prod`, until you trust floating tags.

## Dokploy — beta app

### Registry credentials

Dokploy → **Settings** → **Registry** (or per-app registry):

| Field | Value |
|-------|-------|
| Registry | `ghcr.io` |
| Username | Your GitHub username |
| Password | Fine-grained PAT with **Packages → Read** (separate from `GHCR_WRITE_TOKEN`) |

### Application

| Setting | Value |
|---------|-------|
| Name | `bondery-api-beta` |
| Provider | Docker / Image |
| Image | `ghcr.io/usebondery/bondery-api:beta` |
| Container port | `26631` |
| Auto deploy | On (watch `:beta` tag) |

### Environment variables

Set in Dokploy (not in the image). See [`apps/api/.env.production.example`](../../apps/api/.env.production.example).

Minimum:

```env
NODE_ENV=production
API_HOST=0.0.0.0
PORT=26631
NEXT_PUBLIC_API_URL=https://beta.api.usebondery.com
NEXT_PUBLIC_WEBAPP_URL=https://app.usebondery.com
NEXT_PUBLIC_WEBSITE_URL=https://usebondery.com
```

Plus all `PRIVATE_*` and Supabase keys.

### Domain

| Field | Value |
|-------|-------|
| Host | `beta.api.usebondery.com` |
| HTTPS | On |
| Certificate | Let's Encrypt |
| Container port | `26631` |

DNS: **AAAA** (or **A** if IPv4 enabled) → Hetzner server IP.

**Note:** Traefik needs outbound IPv4 to reach Let's Encrypt. Enable Hetzner primary IPv4 if ACME fails with `network is unreachable`.

### Verify

```bash
curl https://beta.api.usebondery.com/health
curl https://beta.api.usebondery.com/status
```

## Dokploy — production app

Duplicate the beta app as `bondery-api-prod`:

| Setting | Value |
|---------|-------|
| Image | `ghcr.io/usebondery/bondery-api:1.7.0` (pin semver) |
| `NEXT_PUBLIC_API_URL` | `https://api.usebondery.com` |
| Domain | `api.usebondery.com` |

Cutover checklist:

1. Deploy prod image on Dokploy
2. Verify `/health` and WebSocket `/api/sync/ws`
3. Point `api.usebondery.com` DNS to Hetzner

## Rollback

- **Beta:** redeploy `ghcr.io/usebondery/bondery-api:sha-<commit>` in Dokploy
- **Production:** change image tag to previous semver (e.g. `1.6.0`)

## Local Docker smoke test

```bash
docker build -f apps/api/Dockerfile -t bondery-api:local .
docker run --rm -p 26631:26631 --env-file apps/api/.env.production.local bondery-api:local
```
