# Changelog format

## What belongs

Add an entry when a change is notable to at least one of:

- Product users: new behavior, a fix they could observe, or a meaningful performance improvement
- Self-hosters/operators: configuration, deployment, image, port, migration, or compatibility changes
- Security: vulnerability remediation or meaningful hardening
- Contributors: CI, tooling, dependency, or architecture changes that alter how the repository is built or maintained

Omit routine implementation details, formatting, test maintenance, and internal refactors with no meaningful external or contributor impact.

## Document structure

In-flight work lives in [`docs/changelog/unreleased.mdx`](../../../../docs/changelog/unreleased.mdx) (`hidden: true`; unpublished; not in `meta.json`). Each shipped release is a page at `docs/changelog/X.Y.Z.mdx` with `title: "X.Y.Z"`, listed newest-first in [`docs/changelog/meta.json`](../../../../docs/changelog/meta.json). The hub at [`docs/changelog/index.mdx`](../../../../docs/changelog/index.mdx) lists version pages (changelog + GitHub Release when the tag exists); it does not inline every release.
Keep this order within each partial:

```markdown
## [Unreleased]

### ✨ Added

- Webapp: Describe the outcome in user language.
```

Shipped releases use the same category layout under `## [1.8.0] - 12.08.2026` in `docs/changelog/1.8.0.mdx`.

- `Unreleased` remains first even when empty.
- Dated versions are newest first.
- Include only categories that contain entries.
- Use concise past-tense outcome statements.
- Prefix with the product area (`Webapp:`, `Mobile:`, `API:`, `Chrome extension:`) when it clarifies scope.
- Link a migration or contributor guide when the user must take action.

## Release page description

Every shipped release page needs a `description` in frontmatter. The string fills the paragraph under the title, the sitemap entry, the `<meta name="description">` tag, and the `llms.txt` line.

The page title is only a version number (`1.11.0`), so the description must stand alone.

| Rule | Reason |
|------|--------|
| 140 to 160 characters | `check:docs:descriptions` fails outside this band |
| Start with `Bondery X.Y.Z` | The title is a bare number, and search results need the product name |
| Name the two or three changes a reader would search for | A snippet earns its place with a specific change |
| Say "build-only patch" when no user change exists | Silence reads as an oversight |

Do not use these shapes. The check rejects each one.

| Shape | Why it fails |
|-------|--------------|
| `25 new features, 16 fixes, 24 changes` | Counts categories instead of naming changes. The result fits any release. |
| `Release notes from 2 November 2026` | Repeats the date already in the page heading |
| `Everything that changed in this version` | Names nothing, so a reader cannot pick this result over another |
| A sentence copied from the previous release | `check:docs:descriptions` fails when the version in the text does not match the file name |

Good and bad, from real releases:

```
1.11.0  Bondery 1.11.0 adds passkey and email login on mobile, a MapLibre people map,
        chat read-aloud and dictation, and a tag filter on the People page.

1.7.4   Bondery 1.7.4 is a build-only patch. It restores Turbo build dependencies and
        fixes the webapp Docker image, with no user-facing change in it.

bad     Bondery 1.7.4 release notes from 20 July 2026: 3 CI changes across CI.
```

The description is written when the release is cut, in the same pass as the dated section. `changelog/unreleased.mdx` is hidden and unpublished, so it needs no description.

## Categories and commit prefixes

| Section | Use for | Commit prefix |
|---------|---------|---------------|
| `### ✨ Added` | New product or platform capabilities | `feat:` |
| `### 🐛 Fixed` | Defect corrections | `fix:` |
| `### 🔄 Changed` | Meaningful changes to existing behavior or architecture | `refactor:` |
| `### 🔒 Security` | Vulnerability fixes and security hardening | `security:` |
| `### 📝 Documentation` | Notable documentation changes | `docs:` |
| `### 🎨 Style` | Contributor-relevant formatting or styling-only changes | `style:` |
| `### ⚡ Performance` | Measurable or user-visible performance improvements | `perf:` |
| `### 🧪 Tests` | Contributor-relevant test infrastructure or coverage changes | `test:` |
| `### 🤖 CI` | CI, release automation, or build-pipeline changes | `ci:` |
| `### 📦 Dependencies` | Dependency and minimum-version updates | `deps:` |

Commit scopes are allowed, for example `deps(webapp):` or `fix(mobile):`. The changelog bullet should describe the released outcome rather than copy the commit subject mechanically.

## Breaking changes

Use:

```markdown
### Breaking

- **Short label:** Explain who is affected, what changed, and the exact migration or rollback action.
```

`Breaking` supplements the primary category; it does not need its own commit prefix. Include it for incompatible environment names, database/data migrations, port changes, removed contracts, minimum client versions, or deployment-order requirements.

For API contract compatibility, deprecation, and versioning rules, follow [`bondery-api`](../../bondery-api/references/versioning.md).

## Format checklist

- [ ] The change is notable to users, operators, security, or contributors
- [ ] The bullet describes an outcome rather than implementation trivia
- [ ] The category and commit prefix agree
- [ ] Only populated category headings are included
- [ ] The affected area and required action are explicit
- [ ] Breaking changes include a migration or rollback path
