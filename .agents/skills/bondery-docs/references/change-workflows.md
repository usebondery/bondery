# Change workflows

Four workflows cover almost every docs change. Follow the one that matches the work.

## Product change

Use this when behavior, architecture, or setup steps change. Do the docs work in the same change.

1. **Edit or add the page content.** Put it in the folder that owns the audience. See
   [docs-map.md](./docs-map.md).
2. **Update the nearest `meta.json`** when the page is new, moved, or renamed.
3. **Update in-app links.** Add or change `docId` and `docSections` in the frontmatter, then run
   `pnpm run generate:doc-links`. App code uses `helpDoc="your.docId"` or `doc="your.docId"`.
4. **Update cross-links** from related pages. A moved page leaves dead links behind.
5. **Add a changelog entry** for a user-visible change. Read `bondery-changelog`
   (`../../../bondery-changelog/SKILL.md`) for the format and the commit prefix.

`packages/helpers/src/docs/doc-links.generated.ts` is written by
`scripts/pkg/generate-doc-links.mjs`. Never edit that file by hand. `check:docs:links` regenerates
it and then fails when an app references an unknown `docId`.

## New page

1. Create `docs/<area>/<slug>.mdx`. Use a lowercase, hyphenated file name.
2. Add the frontmatter: `title`, `description` (140-160 characters), and `icon` where required.
3. Add the slug to the nearest `meta.json` at the position where it belongs.
4. Add `docId` only when the app links to this page. Then run `pnpm run generate:doc-links`.
5. Cross-link from at least one related page, so the new page is reachable.
6. Run `pnpm run check:docs`.

## Generated content

Never hand-edit any of these. Regenerate them from the source instead.

| Generated artifact | Command | Source |
|--------------------|---------|--------|
| `packages/openapi-spec/openapi.yaml` | `pnpm run generate:openapi` | Zod schemas on Fastify routes |
| `docs/api/api-reference/_generated/**` | `pnpm run generate:api-docs` | `packages/openapi-spec/openapi.yaml` |
| `packages/helpers/src/docs/doc-links.generated.ts` | `pnpm run generate:doc-links` | `docId` frontmatter |
| `llms.txt`, `llms-full.txt`, `/docs/<slug>.md` | Build step in the website app | Page tree and page bodies |

The pre-commit hook regenerates the OpenAPI spec when routes or `@bondery/schemas` change.

## What each check covers

| Command | Scope | Fails when |
|---------|-------|------------|
| `check:docs:links` | `docId` registry and app usage | A generated file is missing an entry, an anchor is missing, app code uses an unknown `docId`, or app code hardcodes a docs URL |
| `check:docs:mdx` | Links and anchors across the whole tree | An internal link points at a page or heading that does not exist |
| `check:docs:descriptions` | Frontmatter of every in-scope page | A `description` is missing, not a single line, shorter than 120, or longer than 160 |
| `check:api-errors:catalog` | `docs/api/errors/*.mdx` against `API_ERROR_CODES` | An error code has no page |

`pnpm run check:docs` runs the first three in order.

## Changelog and ADR placement

| Artifact | Where | Rules |
|----------|-------|-------|
| In-flight release note | `docs/changelog/unreleased.mdx` | `hidden: true`, not in `meta.json`, 404 in production |
| Shipped release | `docs/changelog/X.Y.Z.mdx` | `title: "X.Y.Z"`, listed newest first in `docs/changelog/meta.json` |
| Architecture decision | `docs/adr/NNNN-slug.mdx` | `hidden: true`, absent from `meta.json`, never linked from a published page |

When a decision matters to operators or integrators, restate the relevant facts in the guide they
read. Do not link them to the ADR. Read `bondery-changelog` for the release note format.

## Checklist

- [ ] Page sits in the folder that owns the audience
- [ ] Nearest `meta.json` updated
- [ ] `docId` and `docSections` updated when the app links to the page
- [ ] `pnpm run generate:doc-links` run after a `docId` change
- [ ] Cross-links updated, and no published page links to an ADR
- [ ] Changelog entry added for a user-visible change
- [ ] No generated file edited by hand
- [ ] `pnpm run check:docs` passes
