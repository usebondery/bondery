# CI triggers (operator view)

**Source of truth:** [`.github/workflows/README.md`](../../../../.github/workflows/README.md)

This file interprets CI for release captains. If anything conflicts, trust the workflows README.

## Pipeline layers

| Phase | Trigger | Workflow | Operator outcome |
|-------|---------|----------|------------------|
| PR checks | `pull_request` | `verify.yml` | `contract` (+ `check:versions`) + path-filtered `website-build` |
| Stage artifacts | push `main` | `stage-images.yml` | `:sha-<short>` always; `:beta` + `:X.Y.Z-rc.N` only on named RC cuts |
| Website CD | push `release` | `deploy-website.yml` | Promote `:sha` → `:production` or build fallback; smoke; Dokploy ops webhook |
| **RC** | tag `vX.Y.Z-rc.N` | `rc-release.yml` | Prerelease + staging zip; promote `:sha` → `:X.Y.Z-rc.N` + `:beta`; **no CWS** |
| **Production** | tag `vX.Y.Z` | `release.yml` | Draft then publish GitHub release (no zip); promote/smoke api/webapp; **always CWS** |

`release.yml` still matches `v*.*.*` (includes RC tags) but **skips** refs containing `-rc.`. Do not loosen `shared-release-validate.yml` `^v[0-9]+\.[0-9]+\.[0-9]+$`.

## Promote-first semantics

Release tags **do not rebuild by default**. They promote `ghcr.io/usebondery/{api,webapp}:sha-<short>` → `:X.Y.Z` or `:X.Y.Z-rc.N`.

**Requirement:** the tagged commit must have `:sha-<short>` from `stage-images` on `main`. Production tags also must be on `release`. RC tags do not require `origin/release`.

**CI recovery:** `workflow_dispatch` on `release.yml` with `mode: retry-promote` (not operator hotfix). Optional `force_rebuild: true` when `:sha` is missing.

## Website on `release`

[`deploy-website.yml`](../../../../.github/workflows/deploy-website.yml):

1. Checks whether `website:sha-<short>` exists on GHCR.
2. If yes — promotes to `:production` (no full rebuild).
3. If no — `shared-docker-build-push` fallback.
4. Smoke + Dokploy ops webhook.

## Smoke

- **Unified production release:** smoke runs per changed component via `shared-release-container.yml`.
- **Website:** smoke runs inside `deploy-website.yml`.
- **Manual drill:** `smoke-bondery-stack.yml` (`workflow_dispatch`).

## Dokploy webhooks

Fetched from **Infisical production** (OIDC) in CI.

| Infisical key | Workflow |
|---------------|----------|
| `BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK` | `deploy-website.yml` |
| `BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK` | `release.yml` |
| `BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK` | `stage-images.yml` on named RC cuts |
| `BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK` | `stage-images.yml` on named RC cuts |

Payload uses `refs/heads/release` for production and `refs/heads/main` for staging.

**Extension CI:** production Infisical + CWS on `vX.Y.Z`; staging Infisical + zip on `vX.Y.Z-rc.N`. `PRIVATE_CHROME_*` signing keys remain GitHub secrets (production CRX only).

## Watching CI

After pushing `vX.Y.Z`, `vX.Y.Z-rc.N`, or `release`, use the Cursor **babysit** skill to triage failed checks. Common failures:

- Promote failed — `:sha` missing (merge to `main` first, wait for `stage-images`, or `retry-promote` with `force_rebuild`)
- Smoke failed — inspect workflow logs; do not update Dokploy `BONDERY_INFRA_VERSION` until green
- Extension gate — approve `production-containers` only after CWS is live
