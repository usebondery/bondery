# Versioning and release notes

## Bondery version scheme

Bondery uses `X.Y.Z` as a calendar-derived product version:

- `X` — year offset from 2025 (`2026` → `1`, `2027` → `2`)
- `Y` — calendar month (`1` through `12`)
- `Z` — patch number within that month, starting at `0`

Examples:

- First release in January 2026: `1.1.0`
- Second release in January 2026: `1.1.1`
- First release in July 2026: `1.7.0`

This resembles SemVer syntactically but is not classic semantic versioning. Compatibility and breaking behavior must be described explicitly rather than inferred only from the number.

Named release candidates use SemVer prerelease spelling **`X.Y.Z-rc.N`** (`N >= 1`, never `rc.0`, never `X.Y.Z.rc-N`). RC is a beta channel only: GitHub prerelease + staging zip, GHCR `:X.Y.Z-rc.N` and `:beta`. Dated changelog files (`docs/changelog/releases/X.Y.Z.mdx`) are required for **clean CalVer** production cuts, not for `X.Y.Z-rc.N`. Operator flow: [`bondery-release`](../../bondery-release/SKILL.md).

## While work is in flight

Add notable entries to `## [Unreleased]` in [`docs/changelog/unreleased.mdx`](../../../../docs/changelog/unreleased.mdx). Keep entries grouped by category and update them as the released outcome becomes clearer.

Do not create a dated version section for every merge. A dated section represents a release.

## When cutting a release

1. Calculate `X.Y.Z` from the release year/month and existing releases in that month.
2. Review all changes since the previous release; add missing notable entries and remove internal noise.
3. Create [`docs/changelog/releases/X.Y.Z.mdx`](../../../../docs/changelog/releases/) with `title: "X.Y.Z"`, `## [X.Y.Z] - DD.MM.YYYY`, and the accumulated entries; prepend `"X.Y.Z"` to [`docs/changelog/releases/meta.json`](../../../../docs/changelog/releases/meta.json) (newest first).
4. Reset [`docs/changelog/unreleased.mdx`](../../../../docs/changelog/unreleased.mdx) to an empty `## [Unreleased]` section with category headings as needed.
5. Add `Breaking` notes with migration links when applicable.
6. Complete package version bumps via `pnpm run sync-version`, generated artifacts, builds, extension gates, deployment, and rollback steps via [`bondery-release`](../../bondery-release/SKILL.md). `sync-version` also rewrites `MIN_EXTENSION_VERSION` from the previous production git tag.
7. After deploy smoke passes, move matching ROADMAP cards from Ready for Release to Released per [`bondery-roadmap`](../../bondery-roadmap/references/release-day.md).
8. For a monthly release, use the curated changelog as source material for the [Blog post workflow](../../../workflows/blog/BLOG-POST.md); do not paste commit logs into user communications.

Dependency-only work follows the [Package upgrade workflow](../../../workflows/chores/UPGRADE-PACKAGES.md) and normally uses the `📦 Dependencies` category with a `deps:` commit prefix.

## Release-note checklist

- [ ] Version derives from release year, month, and patch sequence
- [ ] All notable changes since the previous release were reviewed
- [ ] Entries moved from `unreleased.mdx` into `releases/X.Y.Z.mdx`; `"X.Y.Z"` prepended to `releases/meta.json`
- [ ] A clean `Unreleased` section remains in `unreleased.mdx`
- [ ] Breaking and self-hosting actions are explicit
- [ ] Full technical release workflow completed separately
- [ ] Monthly announcement content was drafted from curated outcomes
- [ ] ROADMAP cards updated to Released with changelog links (after deploy smoke)
