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
3. **Curate manually** — commit prefixes help classify changes, but no script generates the product changelog.
4. **Keep `Unreleased` at the top** — collect notable work there until a release is cut.
5. **Newest release first** — use `## [X.Y.Z] - DD.MM.YYYY` and Bondery's calendar version scheme; sidebar order comes from [`docs/changelog/meta.json`](../../../docs/changelog/meta.json). The hub at `/docs/changelog` is an index of version pages (`/docs/changelog/X.Y.Z`), not a concatenated feed.
6. **Call out breaking changes** — migrations, environment/config changes, port changes, and temporary client/server incompatibilities need a `Breaking` section with an upgrade path.
7. **Keep ownership separate** — deployment sequencing stays in the release workflow; API compatibility rules stay in `bondery-api`.

Routine internal refactors, test-only changes, and formatting do not need product changelog entries unless they materially affect contributors, self-hosters, release safety, or user behavior.

## Decision tree

| Task | Read |
|------|------|
| Decide whether and how to write an entry | [references/format.md](references/format.md) |
| Choose a category or commit prefix | [references/format.md](references/format.md) |
| Calculate a version or cut `Unreleased` | [references/versioning-and-release.md](references/versioning-and-release.md) |
| Execute deployment, extension gates, or rollback | [`bondery-release`](../bondery-release/SKILL.md) |
| Update public roadmap cards at release | [`bondery-roadmap`](../bondery-roadmap/SKILL.md) → [release-day.md](../bondery-roadmap/references/release-day.md) |
| Document API compatibility or deprecation | [`bondery-api` versioning](../bondery-api/references/versioning.md) |
| Turn release notes into an announcement | [Blog post workflow](../../workflows/blog/BLOG-POST.md) |
| Sentence craft for user-facing entries | [`bondery-writing` Orwell-Hemingway](../bondery-writing/references/orwell-hemingway.md) |

Full local-reference index: [references/README.md](references/README.md).

## Changelog checklist (before handoff)

- [ ] Only `docs/changelog/unreleased.mdx` was edited (or a release cut touched `docs/changelog/X.Y.Z.mdx` and prepended `X.Y.Z` to `docs/changelog/meta.json`)
- [ ] The entry describes a notable user, operator, contributor, security, or release outcome
- [ ] The entry is under `Unreleased` or the correct newest-first dated version
- [ ] Category and commit prefix match the change
- [ ] Product/app area is named when it makes the impact clearer
- [ ] Breaking behavior includes an explicit migration or upgrade note
- [ ] Version follows Bondery's year-offset/month/patch scheme
- [ ] Release and blog workflows were followed when cutting a release
- [ ] ROADMAP cards for this release moved to Released per [`bondery-roadmap`](../bondery-roadmap/SKILL.md) (after deploy smoke)
