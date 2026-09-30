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
