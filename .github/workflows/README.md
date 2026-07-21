# GitHub Actions layout

GitHub requires workflow files to live directly in `.github/workflows/` (no subfolders). This repo uses a **logical tree** mapped to filenames and shared building blocks.

## Logical structure

```text
verify.yml                 PR + main checks

stage/
  api.yml                  -> stage-api.yml       main -> ghcr.io/usebondery/api:beta
  webapp.yml               -> stage-webapp.yml    main -> ghcr.io/usebondery/webapp:beta

deploy/
  website.yml              -> deploy-website.yml  release -> ghcr.io/usebondery/website:production

release/
  api.yml                  -> release-api.yml       api-X.Y.Z tags
  webapp.yml               -> release-webapp.yml    webapp-X.Y.Z tags
  extension.yml            -> release-extension.yml ext-X.Y.Z tags

smoke/
  bondery-stack.yml        -> smoke-bondery-stack.yml  tag-triggered compose smoke

shared/
  prepare-dockerignore/    -> .github/actions/shared/prepare-dockerignore/
  ghcr-login/              -> .github/actions/shared/ghcr-login/
  docker-build-push.yml    -> shared-docker-build-push.yml
  release-validate.yml     -> shared-release-validate.yml
  container-github-release.yml -> shared-container-github-release.yml
```

## Naming rules

| Prefix | Meaning | Trigger |
|--------|---------|---------|
| `verify` | Quality gates | PR, push to `main` |
| `stage-*` | Integration/staging images | Push to `main` (path-filtered) |
| `deploy-*` | Production CD (floating channel) | Push to `release` (path-filtered) |
| `release-*` | Versioned production releases | Git tags `*-X.Y.Z` |
| `shared-*` | Reusable workflows (not triggered directly) | `workflow_call` only |

Display names use ASCII hyphens (for example `Stage - Webapp`) because GitHub rejects some workflow expressions when combined with certain name encodings, and because reusable-workflow `with:` blocks cannot use the `env` context.

## Docker channels

| Channel | Git trigger | Docker tags |
|---------|-------------|-------------|
| Stage | `main` | `:beta`, `:sha-<short>` |
| Release (api/webapp) | `api-X.Y.Z`, `webapp-X.Y.Z` | `:X.Y.Z`, `:production` |
| Deploy (website) | push to `release` | `:production`, `:sha-<short>` |

Marketing website uses **release-branch CD** (no semver tags). Product containers stay on tagged releases + pinned image tags for self-hosters.

## Local Docker builds

```bash
cp .dockerignore.api .dockerignore    # or .dockerignore.webapp / .dockerignore.website
docker build -f apps/api/Dockerfile .
# website:
docker build -f apps/website/Dockerfile .
```
