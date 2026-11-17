---
name: bondery-docs
description: >
  How to write, structure, and navigate Bondery docs in `docs/`. Use when adding or editing
  an MDX page, frontmatter, `meta.json` navigation, `docId` in-app links, description
  metadata, icons, changelog or ADR placement, or deciding which docs page and owner skill
  apply to a change.
metadata:
  version: "1.1.0"
  namespace: bondery
---

# Bondery docs

This skill routes agents to the right docs page, folder, and owner skill. The published page
[`docs/contributing/how-to-write-docs.mdx`](../../../docs/contributing/how-to-write-docs.mdx)
is the source of truth for humans. This skill does not replace it, and it does not restate it.
This skill adds the agent-facing parts: which folder, which sibling skill, and which gate runs.

`bondery-writing` owns the writing registers. Read it before you write prose.

## When to use

- Adding, editing, or deleting a page under `docs/**/*.mdx`
- Writing or changing frontmatter keys: `title`, `description`, `icon`, `docId`, `docSections`
- Adding, moving, or renaming a page in a `meta.json` sidebar
- Adding an in-app help link (`docId`) or a section anchor (`docSections`)
- Choosing an icon for a page or folder
- Deciding which folder holds a change: `concepts/`, `apps/`, `bondery/`, `api/`, `deploy/`,
  `contributing/`, `changelog/`, `adr/`
- Checking that a docs change is complete before handoff

## Non-negotiables

1. **MDX only.** The docs site compiles `*.mdx` only. A `.md` file in `docs/` is invisible.
2. **Every page has a `description` of 140-160 characters.** That is the pass band.
   `pnpm run check:docs:descriptions` fails below 120 and above 160, and warns between 120 and
   140. Write one line. Folded (`>`) and block (`|`) scalars fail the check.
3. **`docId` is permanent once shipped.** App code references `docId`, never a `/docs/...` path.
   Never hardcode `${HELP_DOCS_URL}/...` or `${WEBSITE_URL}/docs/...`. `check:docs:links` fails.
4. **Sidebar order and grouping live in the nearest `meta.json`.** File order does nothing.
5. **Pick the register by folder.** `concepts/`, `apps/`, `bondery/`, and `getting-started` use
   Orwell-Hemingway. `api/`, `deploy/`, and `contributing/` use ASD-100. Read `bondery-writing`.
   **Do not use em dashes (`—`) in any Bondery text.** Replace with a period, a colon, or a comma.
6. **Never hand-edit generated content.** `docs/api/api-reference/_generated/**` and the OpenAPI
   operation pages come from `packages/openapi-spec/openapi.yaml`. Prose goes elsewhere.
7. **ADRs stay hidden.** `docs/adr/` pages set `hidden: true`, stay out of `meta.json`, and are
   never linked from a published page.
8. **Section anchors use `<a id="anchor-id" />`.** The `{#anchor}` MDX syntax does not work.
9. **Update docs in the same change as the behavior change.** Do not defer docs to a later PR.
10. **Link siblings with a relative `.mdx` path** (`./webapp.mdx`), and a folder with
    `../deploy/installation.mdx`. A root-relative `/docs/...` link fails `check:docs:mdx` on a
    page whose own URL is `/docs`, so use the relative form on `docs/index.mdx`.

## Decision tree

| Task | Read |
|------|------|
| Choose the folder, audience, register, or public URL for a page | [references/docs-map.md](references/docs-map.md) |
| Write frontmatter, `meta.json`, an icon, or a page body | [references/page-anatomy.md](references/page-anatomy.md) |
| Write or fix the `description` frontmatter field | [references/descriptions.md](references/descriptions.md) |
| Change a product behavior, add a page, or place a changelog entry | [references/change-workflows.md](references/change-workflows.md) |

Full index: [references/README.md](references/README.md).

## Sibling skills

`bondery-docs` covers structure. These skills own the content.

| Skill | Owns | Read when |
|-------|------|-----------|
| `bondery-writing` | Register, sentence rules, and the two style guides | Before any prose |
| `bondery-ux` | Product flows, UI copy, empty and error states | Writing user pages under `getting-started`, `apps/`, `bondery/`, `concepts/` |
| `bondery-api` | Route contracts, errors, pagination, MCP naming | Writing `api/` or `contributing/api-routes` |
| `bondery-database` | Prisma, migrations, Postgres conventions | Writing `contributing/schemas` or a data-model page |
| `bondery-core` | Monorepo boundaries and architecture | Writing `contributing/architecture`, `adr/` |
| `bondery-security` | Tenant isolation, secrets, webhooks | Writing `deploy/secrets` or an auth page |
| `bondery-changelog` | Release-note format and commit prefix | Adding a changelog entry |
| `bondery-release` | CalVer, tags, deploy pin | Documenting a release step |
| `bondery-analytics` | PostHog and Plausible conventions | Documenting an event |
| `bondery-legal` | Policy claims and subprocessors | Any doc that names a vendor or a legal term |
| `bondery-skill-authoring` | Skill file layout | Editing a `SKILL.md`, not a docs page |

## Gotchas

- **Operation pages are generated.** Fastify and Zod produce every `/docs/api/api-reference`
  operation page. Put prose in `api/index.mdx`, `api/authentication.mdx`, or `api/guides/`.
- **A named route is checked against the spec.** `check:docs:api-routes` fails when a page names a
  route that `openapi.yaml` does not contain, or when an API-origin URL adds an `/api/` prefix.
  The API origin serves `/contacts`, not `/api/contacts`. The webapp BFF does serve `/api/*`, so
  a webapp URL is exempt.
- **A repeated heading breaks the build check.** Two `##` headings with the same text on one page
  collide after slugging. `check:docs:anchors` fails on the duplicate id.
- **`unreleased.mdx` is not a published page.** It sets `hidden: true`, stays out of `meta.json`,
  and returns 404 in production. It is also the only page under `docs/changelog/` that needs no
  `description`.
- **Every shipped release page needs a `description`.** The title is a bare version, so the sentence
  must start with `Bondery X.Y.Z` and name the notable changes. `check:docs:descriptions` fails on a
  missing version, a category count such as `25 new features`, or a length outside 140-160. Write it
  when you cut the release. Owner: [`bondery-changelog`](../bondery-changelog/SKILL.md).
- **`docs/index.mdx` is the Welcome page.** There is no `docs/index` entry to move, but it must
  stay first in `docs/meta.json`.
- **`description` fills five surfaces at once.** It renders as the lead paragraph under the H1,
  the tile text on folder index pages, `<meta name="description">` and OpenGraph, the `llms.txt`
  line item, and the markdown page body. An empty value leaves all five blank.
- **Folders without `index.mdx` render a tile grid.** `deploy/`, `apps/`, `concepts/`, `bondery/`,
  and `api/guides/` have no index page. Their folder page lists each child with its description.
- **Each API error code needs a page.** `docs/api/errors/*.mdx` is checked by
  `check:api-errors:catalog` against `API_ERROR_CODES`. Add a page when you add a code. Never
  rename an existing error page.
- **The welcome page has no repository tile.** It links readers to a task, not to the source.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm run check:docs` | Run the link, MDX, and description checks |
| `pnpm run check:docs:descriptions` | Validate `description` length, presence, and the release-page rules only |
| `pnpm run check:docs:descriptions:strict` | Treat the 120-140 warning band as a failure |
| `pnpm run check:docs:api-routes` | Validate every API route named in docs against the OpenAPI spec |
| `pnpm run generate:doc-links` | Regenerate `doc-links.generated.ts` from `docId` frontmatter |
| `pnpm run generate:api-docs` | Regenerate the OpenAPI reference pages from `openapi.yaml` |

## Pre-ship checklist

- [ ] Folder matches the audience, and the register matches the folder
- [ ] No em dashes (`—`) anywhere in the page
- [ ] `description` is one line of 140-160 characters, front-loaded with the object noun
- [ ] No two pages in the same folder start with the same three words
- [ ] The nearest `meta.json` lists the page in the right position
- [ ] `icon` set where the authoring guide requires one, and no emoji in `meta.json`
- [ ] `docId` and `docSections` added when the app links to the page, then `pnpm run generate:doc-links`
- [ ] Every internal link resolves, and no published page links to an ADR
- [ ] Changelog entry added for a user-visible change (`bondery-changelog`)
- [ ] Every API route you name exists in the spec (`pnpm run check:docs:api-routes`)
- [ ] `pnpm run check:docs` passes
