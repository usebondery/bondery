---
name: bondery-changelog
description: >
  Bondery product changelog format, change categories, commit prefixes, calendar
  versioning, and release-note workflow. Use when editing docs/changelog/unreleased.mdx,
  documenting a user-visible or operationally notable change, preparing a release,
  choosing a conventional commit prefix, recording dependency updates, or drafting
  release communications.
metadata:
  version: "1.1.0"
  namespace: bondery
---

# Bondery Changelog

## When to use

- Adding a notable change under `Unreleased`
- Turning unreleased entries into a dated version section
- Choosing a changelog category or commit prefix
- Preparing monthly, patch, hotfix, dependency, or security release notes
- Using changelog entries as source material for a release blog post

## Non-negotiables

1. **One product changelog** — [`docs/changelog/index.mdx`](../../../docs/changelog/index.mdx) at `/docs/changelog` indexes shipped versions. Edit [`docs/changelog/unreleased.mdx`](../../../docs/changelog/unreleased.mdx) for in-flight work (unpublished; not in the sidebar).
2. **Write for users and operators** — explain the outcome and affected area, not implementation trivia or commit history. Prose craft is Orwell-Hemingway in [`bondery-writing`](../bondery-writing/SKILL.md).
3. **Curate manually** — commit prefixes help classify changes, but no script generates the product changelog. A generated description of the form "N new features, N fixes" is rejected by the check.
4. **Keep `Unreleased` at the top** — collect notable work there until a release is cut.
5. **Every shipped release page needs a `description`** — one sentence of 140 to 160 characters that names the version and the changes a reader would search for. The title is only a version number, so the sentence must stand alone. `pnpm run check:docs:descriptions` enforces this. See [references/format.md](references/format.md#release-page-description).
6. **Newest release first** — use `## [X.Y.Z] - DD.MM.YYYY` and Bondery's calendar version scheme; sidebar order comes from [`docs/changelog/meta.json`](../../../docs/changelog/meta.json). The hub at `/docs/changelog` is an index of version pages (`/docs/changelog/X.Y.Z`), not a concatenated feed.
7. **Call out breaking changes** — migrations, environment/config changes, port changes, and temporary client/server incompatibilities need a `Breaking` section with an upgrade path.
8. **Keep ownership separate** — deployment sequencing stays in the release workflow; API compatibility rules stay in `bondery-api`.

Routine internal refactors, test-only changes, and formatting do not need product changelog entries unless they materially affect contributors, self-hosters, release safety, or user behavior.

## Decision tree

| Task                                             | Read                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Decide whether and how to write an entry         | [references/format.md](references/format.md)                                                                      |
| Choose a category or commit prefix               | [references/format.md](references/format.md)                                                                      |
| Calculate a version or cut `Unreleased`          | [references/versioning-and-release.md](references/versioning-and-release.md), then the helper script below        |
| Execute deployment, extension gates, or rollback | [`bondery-release`](../bondery-release/SKILL.md)                                                                  |
| Update public roadmap cards at release           | [`bondery-roadmap`](../bondery-roadmap/SKILL.md) → [release-day.md](../bondery-roadmap/references/release-day.md) |
| Document API compatibility or deprecation        | [`bondery-api` versioning](../bondery-api/references/versioning.md)                                               |
| Turn release notes into an announcement          | [Blog post workflow](../../workflows/blog/BLOG-POST.md)                                                           |
| Sentence craft for user-facing entries           | [`bondery-writing` Orwell-Hemingway](../bondery-writing/references/orwell-hemingway.md)                           |

Full local-reference index: [references/README.md](references/README.md).

## Helper script

[`scripts/changelog.mjs`](scripts/changelog.mjs) does the mechanical part of a release cut. Run it from the repo root. It never writes prose: you supply the `description`.

```bash
# Next calendar version for today (or --date YYYY-MM-DD)
node .agents/skills/bondery-changelog/scripts/changelog.mjs next-version

# Entries per category in Unreleased, and the next version
node .agents/skills/bondery-changelog/scripts/changelog.mjs status

# Cut: writes docs/changelog/X.Y.Z.mdx, prepends X.Y.Z to meta.json, resets unreleased.mdx
node .agents/skills/bondery-changelog/scripts/changelog.mjs cut X.Y.Z   --description "Bondery X.Y.Z …" [--date YYYY-MM-DD] [--dry-run]
```

`cut` refuses an empty `Unreleased`, a release candidate (`-rc.N` has no page), a version that already has a page, and a description outside 140 to 160 characters or without the `Bondery X.Y.Z` start. Use `--dry-run` first. Tests: `node --test .agents/skills/bondery-changelog/scripts/*.test.mjs` (also part of `pnpm run test:check-scripts`).

## Changelog checklist (before handoff)

- [ ] Only `docs/changelog/unreleased.mdx` was edited (or a release cut, made with `scripts/changelog.mjs cut`, touched `docs/changelog/X.Y.Z.mdx` and prepended `X.Y.Z` to `docs/changelog/meta.json`)
- [ ] The release page has a `description` of 140 to 160 characters that starts with `Bondery X.Y.Z` and names the notable changes
- [ ] The entry describes a notable user, operator, contributor, security, or release outcome
- [ ] The entry is under `Unreleased` or the correct newest-first dated version
- [ ] Category and commit prefix match the change
- [ ] Product/app area is named when it makes the impact clearer
- [ ] Breaking behavior includes an explicit migration or upgrade note
- [ ] Version follows Bondery's year-offset/month/patch scheme
- [ ] Release and blog workflows were followed when cutting a release
- [ ] ROADMAP cards for this release moved to Released per [`bondery-roadmap`](../bondery-roadmap/SKILL.md) (after deploy smoke)
