# CI triggers (operator view)

**Source of truth:** [`.github/workflows/README.md`](../../../../.github/workflows/README.md)

This file interprets CI for release captains. If anything conflicts, trust the workflows README.

## Pipeline layers

| Phase | Trigger | Workflow | Operator outcome |
|-------|---------|----------|------------------|
| PR checks | `pull_request` | `verify.yml` | `contract` (+ `check:versions`) + path-filtered `website-build` |
| Stage artifacts | push `main` | `stage-images.yml` | `:sha-<short>` always; `:beta` + `:X.Y.Z-rc.N` only on named RC cuts |
| Website CD | push `release` | `deploy-website.yml` | Promote `:sha` → `:production` or build fallback; smoke; Dokploy ops webhook |
| **RC** | tag `vX.Y.Z-rc.N` | `rc-release.yml` | Prerelease + staging zip; **verify** `:sha` / `:X.Y.Z-rc.N` / `:beta` digests match; **no CWS**; does not retag `:beta` |
| **Production** | tag `vX.Y.Z` | `release.yml` | Draft then publish GitHub release (no zip); promote last named `:X.Y.Z-rc.N` → `:X.Y.Z`; smoke; **always CWS**; `:production` + `:latest` after gate |

`release.yml` still matches `v*.*.*` (includes RC tags) but **skips** refs containing `-rc.`. Do not loosen `shared-release-validate.yml` `^v[0-9]+\.[0-9]+\.[0-9]+$`.

## Promote-first semantics

Release tags **do not rebuild by default**.

- Named RC **merge to `main`** (`stage-images`, `is_rc_cut`) builds `:sha-<short>`, `:X.Y.Z-rc.N`, and `:beta` (same digest).
- `vX.Y.Z-rc.N` **verifies** those three digests match the tag commit. It does not retag `:beta`.
- `vX.Y.Z` **promotes** the highest named `:X.Y.Z-rc.N` digest to `:X.Y.Z` (that digest must equal the RC-cut `:sha-<short>`). After smoke + CWS `production-containers` gate, `:production` and `:latest`. Drop-rc git commit is changelog / `package.json` / CWS — not the container source.

**Requirement:** the RC-cut commit must have `:sha-<short>` from `stage-images` on `main`. Production tags also must be on `release`. RC tags do not require `origin/release`.

**CI recovery:** `workflow_dispatch` on `release.yml` with `mode: retry-promote` (not operator hotfix). Default `source: rc` (last named RC digest; missing RC fails). `source: tag-sha` promotes the production tag commit `:sha-*` (explicit no-RC hotfix). Optional `force_rebuild: true` rebuilds from source.

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

- Promote failed — named RC image missing or digest mismatch (cut/tag an RC first, or `retry-promote` with `source: tag-sha` / `force_rebuild`)
- Smoke failed — inspect workflow logs; do not update Dokploy `BONDERY_INFRA_VERSION` until green
- Extension gate — approve `production-containers` only after CWS is live
