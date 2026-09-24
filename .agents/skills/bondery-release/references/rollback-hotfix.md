# Rollback and hotfix

## Hotfix (patch release)

For urgent fixes between monthly releases:

1. Fix the issue on `main`.
2. Bump only the **Z** segment (e.g. `1.8.0` → `1.8.1`) via `pnpm run sync-version`.
3. Follow [prerequisites.md](prerequisites.md) and [sequencing-and-gates.md](sequencing-and-gates.md).
4. Cut a named RC (`X.Y.Z-rc.1`) so GA has a digest to promote, then tag unified release: `git tag vX.Y.Z && git push origin vX.Y.Z`.

Keep hotfixes small. Prefer one logical fix per patch.

**Do not** use `retry-promote` workflow dispatch for operator hotfixes — that mode is CI failure recovery only. A no-RC incident uses `source: tag-sha` or `force_rebuild: true` on that dispatch — never a silent drop-rc fallback.

## Production rollback (product stack)

1. Restore the previous `BONDERY_INFRA_VERSION` in Dokploy (e.g. `1.8.2`).
2. Save env and redeploy **api + webapp together**.
3. Update [`manifest.ts`](../../../../packages/helpers/src/env/manifest.ts) deploy pin if documenting the rollback in git.
4. Do **not** rely on floating `:production` as the rollback target in production/self-host configs.

Changing Dokploy env alone does not rollback until you trigger a redeploy.

## Website rollback

Marketing site uses `:production` on the ops stack. Rollback options:

- Point ops Compose at a known `ghcr.io/usebondery/website:sha-<short>`, or
- Use Dokploy's previous deployment snapshot.

## Rollback via new patch (preferred for code defects)

1. Revert faulty commits on `main` (or fix forward).
2. Cut a new patch release (`Z+1`) following the hotfix flow.
3. Tag `vX.Y.Z` and promote through unified [`release.yml`](../../../../.github/workflows/release.yml).

## Chrome extension rollback

You **cannot unpublish** a Chrome Web Store update. Submit a fixed version with a new product semver and wait for CWS approval.

## CI retry-promote (not hotfix)

When a unified release job failed after `vX.Y.Z` was pushed and production never received the bad image:

1. Fix the underlying issue on `main` / `release` if needed.
2. GitHub Actions → **Release - Bondery** → `mode: retry-promote`, `version: X.Y.Z`, select failed `components`. Default `source: rc` (last named RC). Use `source: tag-sha` only for an explicit no-RC promote of the tag commit `:sha-*`. Use `force_rebuild: true` to rebuild from source.
3. Confirm Dokploy `BONDERY_INFRA_VERSION` was **not** updated to the failed version.

## CI rollback (workflow regression)

If a workflow change breaks promote/smoke:

1. Revert the workflow PR on `main`.
2. Re-run `stage-images` or use `retry-promote` with `force_rebuild: true` if images are missing.
3. Re-apply branch protection rules if ruleset JSON changed (`pnpm run github:rulesets -- main` or `gh api` on Windows).

## Rollback checklist

- [ ] Previous `BONDERY_INFRA_VERSION` documented before deploy
- [ ] Dokploy env restored or patch release cut
- [ ] api + webapp redeployed together after pin change
- [ ] Smoke verified after rollback or patch deploy
- [ ] Changelog documents the incident if user-visible
