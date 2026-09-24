# GitHub Actions layout

GitHub requires workflow files to live directly in `.github/workflows/` (no subfolders). This repo uses a **logical tree** mapped to filenames and shared building blocks.

## Logical structure

```text
verify.yml                 PR checks only (contract + path-filtered website-build)

stage/
  images.yml               -> stage-images.yml    main -> :sha; :beta + named RC only on RC cuts

deploy/
  website.yml              -> deploy-website.yml  release -> promote :sha or build -> :production

release/
  bondery.yml              -> release.yml           vX.Y.Z unified production (skips -rc)
  rc.yml                   -> rc-release.yml        vX.Y.Z-rc.N prerelease + staging zip; no CWS

smoke/
  bondery-stack.yml        -> smoke-bondery-stack.yml  manual workflow_dispatch drill

shared/
  prepare-dockerignore/    -> .github/actions/shared/prepare-dockerignore/
  ghcr-login/              -> .github/actions/shared/ghcr-login/
  ghcr-login-infisical/    -> .github/actions/shared/ghcr-login-infisical/
  infisical-fetch-secrets/   -> .github/actions/shared/infisical-fetch-secrets/
  infisical-staging-secrets/ -> .github/actions/shared/infisical-staging-secrets/
  infisical-production-secrets/ -> .github/actions/shared/infisical-production-secrets/
  derive-public-urls/        -> .github/actions/shared/derive-public-urls/
  dokploy-save-compose-env/  -> .github/actions/shared/dokploy-save-compose-env/
  turbo-remote-cache/      -> .github/actions/shared/turbo-remote-cache/
  website-prune-build/     -> .github/actions/shared/website-prune-build/
  dokploy-deploy-webhook/  -> .github/actions/shared/dokploy-deploy-webhook/
  docker-build-push.yml    -> shared-docker-build-push.yml
  promote-image-tag.yml    -> shared-promote-image-tag.yml
  release-validate.yml     -> shared-release-validate.yml
  release-container.yml    -> shared-release-container.yml
  release-extension.yml    -> shared-release-extension.yml
  smoke-bondery.yml        -> shared-smoke-bondery.yml
  promote-production.yml   -> shared-promote-production.yml
```

## Naming rules

| Prefix | Meaning | Trigger |
|--------|---------|---------|
| `verify` | Quality gates | **PR only** (`website-build` path-filtered; `contract` always runs). Uses `concurrency` to cancel stale runs. |
| `stage-images` | Integration images on main | Push to `main` (path-filtered matrix: api, webapp, website) |
| `deploy-*` | Production CD (floating channel) | Push to `release` (path-filtered); website promotes `:sha` when staged on main |
| `release-*` | Versioned production releases | Git tag `vX.Y.Z` (skips `-rc.`) |
| `rc-release` | Named RC / beta | Git tag `vX.Y.Z-rc.N` |
| `shared-*` | Reusable workflows (not triggered directly) | `workflow_call` only |
| `sync-dokploy-env` | Infisical → Dokploy ops env sync | `workflow_dispatch` (OIDC only; no GitHub secrets) |

Display names use ASCII hyphens (for example `Stage - Webapp`) because GitHub rejects some workflow expressions when combined with certain name encodings, and because reusable-workflow `with:` blocks cannot use the `env` context.

**Branch protection:** `.github/rulesets/protect-main.json` sets `strict_required_status_checks_policy: true` so PRs must be up to date with `main` before merge. Apply with `pnpm run github:rulesets -- main`.

**Node on runners:** Host jobs pin Node 26 via `devEngines.runtime` in root `package.json` (`pnpm/setup@v1` reads it and installs the runtime). Production Docker images use `node:26-slim` with `pnpm install --no-runtime` (Node is already in the image). Host CI uses the shared `setup-pnpm` composite (`pnpm/setup` + `pnpm ci`); pnpm version comes from `packageManager` (`pnpm@12.4.0`). Docker builder stages install pnpm globally (`npm install -g pnpm@12.4.0`) — Node 25+ does not ship corepack.

**Dokploy webhooks** (Infisical **production** via OIDC):

| Infisical key | Workflow | Dokploy app |
|---------------|----------|-------------|
| `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` | `deploy-website.yml` (after smoke) | `deploy/ops` marketing website |
| `BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK` | `release.yml` | `deploy/bondery` product stack |
| `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK` | `stage-images.yml` (named RC cuts on `main`) | `bondery-beta` product stack |
| `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK` | `stage-images.yml` (named RC cuts on `main`) | `bondery-beta` marketing website |

Workflows fetch production secrets with `infisical-production-secrets`. Empty webhook skips redeploy (manual Dokploy).

**Extension release** (`shared-release-extension.yml`): `flavor: production` (CWS; omit `manifest.key`) or `flavor: staging` (GitHub RC zip; include key). Production Infisical vs staging Infisical accordingly. **Still on GitHub secrets:** `PRIVATE_CHROME_*` signing keys (CWS CRX only), `BONDERY_OPS_TURBO_*`. **GHCR:** `BONDERY_OPS_GHCR_WRITE_TOKEN` from Infisical production (`ghcr-login-infisical`).

**Turbo remote cache** (`BONDERY_OPS_TURBO_TOKEN` secret + `BONDERY_OPS_TURBO_TEAM` variable):

| Where | Mechanism |
|-------|-----------|
| `verify` `contract`, `website-build` | `turbo-remote-cache` action |
| `shared-release-extension` | job `env` `TURBO_TOKEN` / `TURBO_TEAM` |
| Docker builds (api, webapp, website) | `shared-docker-build-push` passes `TURBO_TEAM` build-arg + `turbo_token` secret; Dockerfiles mount secret on `turbo build` |

**Verify path filters:** `website-build` runs when marketing-site paths change. `contract` always runs. API HTTP integration (`test:api`) is not in CI; run manually when changing routes if needed. Auth integration (`pnpm --filter api run test:auth`) is local-only until the suite is repaired.

Docker builds also use GHA layer cache (`cache-from: type=gha`). Builder stages copy pruned manifests and sources, then run a single `pnpm install --no-runtime` with a BuildKit cache mount for the pnpm store (`id=bondery-pnpm-store-v3`). The lockfile does not record `devEngines.runtime` (`runtime: false`); a second frozen install or `pnpm prune --prod` against a turbo-prune lockfile otherwise fails with `missing snapshot for node@runtime`. Next.js images skip `pnpm prune --prod` because pnpm 12 pacquet cannot restage a hoisted `node_modules` in Docker. `--no-runtime` skips downloading Node (already in the image); `pnpm fetch` is not used because it cannot skip runtime packages. Requires BuildKit (enabled by default in Docker 23+ and GitHub Actions `docker/build-push-action`).

## Docker channels

| Channel | Git trigger | Docker tags |
|---------|-------------|-------------|
| Everyday `main` | push `main` (not an RC cut) | `:sha-<short>` only |
| Named RC cut | push `main` when package.json becomes `X.Y.Z-rc.N` | `:sha-<short>`, `:X.Y.Z-rc.N`, `:beta` |
| RC tag | `vX.Y.Z-rc.N` (`rc-release.yml`) | Verify `:sha-<short>` = `:X.Y.Z-rc.N` = `:beta` (no retag) |
| Production tag | `vX.Y.Z` (`release.yml`; skips `-rc.`) | Promote last `:X.Y.Z-rc.N` → `:X.Y.Z`; `:production` + `:latest` after smoke + CWS gate |
| Deploy (website) | push to `release` | Promote `:sha-<short>` → `:production` + `:latest` when image exists on main; else build |

`:sha-<short>` is the **immutable artifact** built on `main`. Named RC cuts also tag `:X.Y.Z-rc.N` and `:beta` (same digest). `:beta` is a floating pointer updated **only on named RC cuts**, not every merge and not on the RC git tag. `vX.Y.Z` promotes that named RC digest; drop-rc is changelog / `package.json` / CWS. `:latest` is an alias of `:production` — pin CalVer (`BONDERY_INFRA_VERSION=X.Y.Z`), never `:latest`. Health `version` follows runtime `BONDERY_INFRA_VERSION` when it is production CalVer — never the word `beta`.

Release workflows support `retry-promote` dispatch on `release.yml` with default `source: rc` (last named RC; missing RC fails). Use `source: tag-sha` to promote the tag commit `:sha-*`, or `force_rebuild: true` to rebuild from source.

Self-hosters pin **`BONDERY_INFRA_VERSION=X.Y.Z`** — both api and webapp images. RC is not a self-host channel.

## Local Docker builds

BuildKit is required for pnpm store cache mounts (`DOCKER_BUILDKIT=1` on older Docker).

```bash
cp .dockerignore.api .dockerignore    # or .dockerignore.webapp / .dockerignore.website
DOCKER_BUILDKIT=1 docker build -f apps/api/Dockerfile .
# website:
DOCKER_BUILDKIT=1 docker build -f apps/website/Dockerfile .
```

If you change lockfile layout or pnpm major version, bump the BuildKit cache id in Dockerfiles (`bondery-pnpm-store-v3`) to avoid stale store entries.

## Release smoke and Infisical

**Infisical environment slugs** (`bondery-secrets`, EU): `development` (local `pnpm run env:pull`), `staging` (release smoke SMTP), `production` (Dokploy sync, extension publish, Dokploy CD webhooks). Slugs match the Infisical display names.

**Production Infisical keys for CI** (in addition to runtime/Dokploy sync keys):

| Key | CI use |
|-----|--------|
| `BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK` | Product stack redeploy after unified release |
| `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` | Marketing website redeploy (`deploy-website.yml`) |
| `BONDERY_INFRA_CHROME_EXTENSION_ID`, `BONDERY_OPS_CHROME_PUBLISHER_ID` | Chrome Web Store API |
| `BONDERY_OPS_GHCR_WRITE_TOKEN` | GHCR login (docker build, promote, smoke pull) |
| `BONDERY_INFRA_WEBAPP_DOMAIN`, `BONDERY_INFRA_API_DOMAIN` | Derive extension build URLs |
| `BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID` | Extension OAuth client id |

**Ops checklist (Infisical UI — before relying on Infisical-only CI):**

1. Populate production keys above.
2. Machine identity `f8b9e69d-bc32-4066-ad99-8ad6ecff2d21` — **read** on **production** and **staging**.
3. OIDC subjects cover: `release.yml`, `rc-release.yml`, `shared-release-extension.yml`, `deploy-website.yml`, smoke workflows, `sync-dokploy-env.yml`.
4. Audience: `https://github.com/usebondery`.
5. GitHub retains only Turbo (`BONDERY_OPS_TURBO_*`) and Chrome signing (`PRIVATE_CHROME_*`) secrets.

Release smoke (`shared-smoke-bondery.yml`, `smoke-bondery-stack.yml`) boots the API with `NODE_ENV=production`, which **live-verifies SMTP** at startup. Fake `smtp.example.com` placeholders from `deploy/bondery/.env.example` fail that check.

Before `smoke-release.mjs`, workflows run `./.github/actions/shared/infisical-staging-secrets`, which uses [Infisical/secrets-action](https://github.com/Infisical/secrets-action) with **OIDC** to fetch the **staging** environment from project `bondery-secrets` (EU: `https://eu.infisical.com`). The smoke script overlays these five keys into `.env.smoke`:

- `BONDERY_PRIVATE_EMAIL_ADDRESS`
- `BONDERY_PRIVATE_EMAIL_HOST`
- `BONDERY_PRIVATE_EMAIL_PASS`
- `BONDERY_PRIVATE_EMAIL_PORT`
- `BONDERY_PRIVATE_EMAIL_USER`

**Ops checklist (Infisical UI):**

1. Machine identity `f8b9e69d-bc32-4066-ad99-8ad6ecff2d21` uses **OIDC** (not Universal Auth).
2. Bound subject includes this repo's release/smoke workflows (e.g. `repo:usebondery/bondery:ref:refs/heads/release` or workflow-scoped subjects).
3. Audience: `https://github.com/usebondery`.
4. Identity has **read** on the **staging** environment.

Jobs need `permissions.id-token: write`. No GitHub secrets are required for Infisical OIDC.

**Local smoke with real SMTP:**

```bash
infisical run --projectId=7395aabc-4cab-4cfe-aef2-a66899da5430 --env=staging --domain=https://eu.infisical.com -- \
  node deploy/bondery/scripts/smoke-release.mjs --service api --tag 1.8.0
```

Use `defaultEnvironment: development` in `.infisical.json` for `pnpm env:pull`; release smoke uses **`staging`**; Dokploy ops sync uses **`production`**.

## Dokploy env sync (`sync-dokploy-env.yml`)

Manual workflow: upload manifest `dokploySync` keys to a Dokploy compose app via OIDC (no GitHub secrets).

| Input | Role |
|-------|------|
| `deployment` | `production` — Infisical production only. `beta` — staging app secrets + production ops keys (website and services). |
| `target` | `website` (`deploy/ops`), `services` (`deploy/bondery`), or `plausible` (`deploy/plausible`). With `deployment=beta`, `website` maps to `website-beta` and `services` maps to `services-beta`. Plausible is production-only. |
| `dry_run` | Log env names to runner console instead of uploading to Dokploy API. |
| `redeploy` | POST Dokploy deploy webhook after save (`refs/heads/release` for production stacks; `refs/heads/main` for beta website and product stacks). |

**Infisical fetch by deployment:**

| `deployment` | App secrets source | Ops keys (`BONDERY_OPS_DOKPLOY_*`) |
|--------------|-------------------|-------------------------------------|
| `production` | production | production |
| `beta` | staging (after production fetch + ops snapshot restore) | production |

Dokploy connection creds and compose ids live in Infisical **production** — including `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_*` and `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_*` for the beta stacks.

| Infisical key (production) | Role |
|----------------------------|------|
| `BONDERY_OPS_DOKPLOY_HOST`, `BONDERY_OPS_DOKPLOY_API_KEY` | Dokploy API (required for all targets) |
| `BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID` | Website stack compose id |
| `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` | Optional redeploy for **website** when `redeploy: true` |
| `BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID` | Product stack compose id (`deploy/bondery`) |
| `BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK` | Optional redeploy for **services** when `redeploy: true` |
| `BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID` | Plausible stack compose id |
| `BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK` | Optional redeploy for **plausible** when `redeploy: true` |
| `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID` | Beta product stack compose id (`bondery-beta`) |
| `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK` | Optional redeploy for **beta** (`deployment=beta`, `redeploy=true`) or when `stage-images` fires; payload `refs/heads/main` |
| `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID` | Beta marketing website compose id |
| `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK` | Optional redeploy for **beta website** (`deployment=beta` `target=website`, `redeploy=true`) or when `stage-images` fires; payload `refs/heads/main` |

**Uploaded keys by target:**

| Target | Keys |
|--------|------|
| `website` | `BONDERY_INFRA_WEBAPP_DOMAIN`, `BONDERY_INFRA_WEBSITE_DOMAIN`, `BONDERY_INFRA_PLAUSIBLE_DOMAIN`, plus `BONDERY_INFRA_TRAEFIK_PREFIX` and `BONDERY_INFRA_WEBSITE_IMAGE_TAG` when set |
| `website-beta` | Same upload keys as `website`; compose id / webhook from `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_*` in production Infisical; app secret values from Infisical **staging** when `deployment=beta` |
| `services` | All `deploy/bondery/.env.example` manifest keys except `BONDERY_INFRA_GIT_SHA`, `BONDERY_INFRA_VERSION`, `BONDERY_PRIVATE_S3_ENDPOINT`, `BONDERY_PUBLIC_STORAGE_URL` (compose derives storage URL from `BONDERY_INFRA_STORAGE_DOMAIN`; image pin stays in the Dokploy UI). `BONDERY_INFRA_TRAEFIK_PREFIX` syncs from Infisical (`bondery` in production, `bondery-beta` in staging). |
| `services-beta` | Same upload keys as `services`; compose id / webhook from `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_*` in production Infisical; app secret values from Infisical **staging** when `deployment=beta` |
| `plausible` | `BONDERY_INFRA_PLAUSIBLE_DOMAIN`, `BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE`, `BONDERY_PRIVATE_PLAUSIBLE_TOTP_VAULT_KEY`, `BONDERY_PRIVATE_PLAUSIBLE_POSTGRES_PASSWORD`, `BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION` (optional) |

**Ops checklist:**

1. Identity `f8b9e69d-bc32-4066-ad99-8ad6ecff2d21` — **read** on **production** (in addition to staging).
2. OIDC subject covers `sync-dokploy-env.yml`.
3. First run with `dry_run: true` per target — verify upload keys (no `BONDERY_OPS_*` connection keys).
4. `dry_run: false` — backup Dokploy env before first live sync; SHA / version stay in Dokploy UI. Website image tag syncs from Infisical.

Release and deploy workflows read Dokploy webhook URLs from **production Infisical** (OIDC).
