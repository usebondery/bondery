# Prerequisites on `main`

Complete version machinery on `main` **before** tagging. Named RCs do not need a dated changelog; production CalVer does.

## Identity

| Channel | Root `package.json` | Git tag | GHCR | GitHub Release |
|---------|---------------------|---------|------|----------------|
| Everyday `main` | last RC or last prod | none | `:sha-<short>` only | none |
| Beta / RC | `X.Y.Z-rc.N` (N ≥ 1) | `vX.Y.Z-rc.N` | `:X.Y.Z-rc.N` + `:beta` | **prerelease**, **with** staging zip |
| Production | `X.Y.Z` | `vX.Y.Z` | `:X.Y.Z` + `:production` | **not** prerelease, **no** zip |

Spelling is SemVer `1.9.1-rc.1` (not `1.9.1.rc-1`). Forbid `rc.0`. Chrome maps RC to `manifest.version` `1.9.1.N` plus `version_name` `1.9.1-rc.1`.

Production promote is always a **new SHA** after dropping `-rc`. Do not retag an RC image as `X.Y.Z`.

## 1. Bump version numbers

Bump root [`package.json`](../../../../package.json) `version`, then propagate:

```bash
pnpm run sync-version
```

This updates all workspace `package.json` files (npm may be `X.Y.Z-rc.N`), keeps **mobile native** fields as 3-part CalVer (`X.Y.Z` — iOS/Android cannot take `-rc.N`), writes `MIN_EXTENSION_VERSION` from the **previous production git tag**, and regenerates env examples. `deploy/bondery/.env.example` `BONDERY_INFRA_VERSION` stays last production `X.Y.Z` (never RC).

Need tags locally: `git fetch --tags`. Missing production tags fail loudly — do not leave a stale MIN.

Version math and changelog cut: [`bondery-changelog` versioning](../../bondery-changelog/references/versioning-and-release.md).

## 2. Minimum extension version

`MIN_EXTENSION_VERSION` in [`packages/helpers/src/globals/paths.ts`](../../../../packages/helpers/src/globals/paths.ts) is **generated** by `sync-version` (previous production `X.Y.Z`). Always 3-part. Do not hand-edit. Never bake Chrome 4-part into the 426 floor.

The public manifest `latestVersion` is the current **production** CalVer (root version on a production package; previous production while on RC) for a non-blocking update banner. 426 stays on MIN.

## 3. Product changelog (production only)

Cut the changelog per [`bondery-changelog` versioning](../../bondery-changelog/references/versioning-and-release.md): create `docs/changelog/releases/X.Y.Z.mdx`, prepend `"X.Y.Z"` to `docs/changelog/releases/meta.json`, and reset `docs/changelog/unreleased.mdx`. Follow [`bondery-changelog` format](../../bondery-changelog/references/format.md).

RC cuts on `chore/release-*` must **not** require `X.Y.Z-rc.N.mdx`.

## 4. OpenAPI spec

```bash
pnpm run generate:openapi
```

Commit generated output so API docs and clients stay in sync.

## 5. Build and verify

```bash
pnpm run build
pnpm run check:versions
```

Or run `bondery-verification-loop` for the release-scoped diff. Fix failures before proceeding.

## 6. Commit to `main`

Commit prerequisites as one or more logical commits on `main` (often via a `chore/release-X.Y.Z` PR). Merge PRs first so `stage-images` can build `:sha-<short>` for the release commit.

## Operator flow

**Cut beta `X.Y.Z-rc.1`**

1. Branch `chore/release-X.Y.Z`, set root version `X.Y.Z-rc.1`, `pnpm run sync-version`.
2. Merge to `main` → `stage-images` → `:sha` + `:beta` + `:X.Y.Z-rc.1`.
3. `git tag vX.Y.Z-rc.1 && git push` → GitHub prerelease + staging zip.
4. Beta patch: `X.Y.Z-rc.2`, repeat.

**Cut production `X.Y.Z`**

1. PR: `X.Y.Z-rc.N` → `X.Y.Z`, dated changelog, `sync-version` (MIN = previous prod).
2. Merge → `:sha` only (does not move `:beta`).
3. `git tag vX.Y.Z` → `:X.Y.Z` + `:production`, CWS, GitHub release without zip.
4. Approve `production-containers` after CWS is published.

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Production releases use unified `vX.Y.Z` tags only (`release.yml`). RC tags use [`rc-release.yml`](../../../../.github/workflows/rc-release.yml).

## Prerequisites checklist

- [ ] `pnpm run sync-version` and `pnpm run check:versions` pass
- [ ] `MIN_EXTENSION_VERSION` is previous production (from `sync-version`), not hand-edited
- [ ] Production: `docs/changelog/releases/X.Y.Z.mdx` created; `"X.Y.Z"` prepended to `docs/changelog/releases/meta.json`; fresh `Unreleased` in `unreleased.mdx`
- [ ] OpenAPI generated and committed
- [ ] `pnpm run build` (or verification loop) passes
- [ ] Changes merged on `main`
- [ ] `stage-images` green on release commit for changed services
