# Page anatomy

A docs page is an MDX file with frontmatter. The docs site reads both. Keep the frontmatter
minimal. Add a key only when the page needs it.

## Frontmatter keys

The schema lives in `apps/website/src/lib/collections.ts`. It extends the fumadocs `pageSchema`.

| Key | Required | Purpose |
|-----|----------|---------|
| `title` | Yes | Sidebar label and the H1 on the page |
| `description` | Yes for every in-scope page | Lead paragraph, tile text, meta description, `llms.txt` line. 140-160 characters |
| `icon` | Per the authoring guide | Tabler name without the `Icon` prefix, shown in the sidebar and folder tiles |
| `docId` | Only for app-linked pages | Permanent identifier the app uses through `DOC_LINKS`. Never the file path |
| `docPath` | Rarely | Overrides the path derived from the file location. Use only when the public slug differs |
| `docSections` | With `docId` when sections must be linkable | Maps a section suffix to an anchor id. Key becomes `<docId>.<key>` |
| `hidden` | Changelog partials and ADRs only | Hides the page from the sidebar |
| `full` | Rarely | Drops the table-of-contents rail when the page is wider than prose |

`docId` is created once and kept forever. App code calls `helpDoc="your.docId"` or `doc="your.docId"`.
After a change, run `pnpm run generate:doc-links`.

## `meta.json`

A folder sorts its children with a `meta.json` file. Nothing else sets sidebar order.

| Field | Type | Meaning |
|-------|------|---------|
| `title` | string | Folder label in the sidebar |
| `icon` | string | Tabler name for the folder, without the `Icon` prefix |
| `pages` | string[] | Ordered child slugs. A `"---Label---"` string renders a separator |

Real example, `docs/deploy/meta.json`:

```json
{
  "pages": ["requirements", "installation", "configuration", "secrets", "update", "backups"],
  "title": "Self-hosting"
}
```

The root `docs/meta.json` mixes sections with separators:

```json
{
  "pages": [
    "index",
    "---Getting started---",
    "getting-started",
    "apps",
    "bondery",
    "concepts",
    "---Help---",
    "getting-help-and-troubleshooting",
    "---Changelog---",
    "roadmap",
    "changelog",
    "---Prerequisites---",
    "deploy/requirements",
    "deploy/installation"
  ],
  "title": "Bondery"
}
```

## Icons

Use [Tabler](https://tabler.io/icons) names without the `Icon` prefix, for example `User` and `Bell`.
Top-level folders need a folder `icon`. Self-host, concepts, and apps pages need a page `icon`. The
authoring guide page does not. Never put an emoji in `meta.json`. The name must exist in the
allow-list in `apps/website/src/components/docs/DocsIcon.tsx`. The full per-folder icon table lives
in [docs/contributing/how-to-write-docs.mdx](../../../../docs/contributing/how-to-write-docs.mdx).

## MDX components

Every component below is registered in `apps/website/src/components/mdx.tsx`.

| Component | Use when |
|-----------|----------|
| `<Callout type="info \| warn \| error">` | A caveat, a warning, or a non-obvious constraint |
| `<Cards>` / `<Card>` | A navigation hub with a small fixed set of destinations |
| `<Steps>` / `<Step>` | An ordered setup flow, instead of manual `## 1.` headings |
| `<Files>` / `<Folder>` / `<File>` | A repository or directory tree, instead of ASCII art |
| `<Accordions>` / `<Accordion>` | FAQ-style question and answer blocks |
| `<BonderyRepo />` | The GitHub repository tile, used on the contributing index |
| `<RepoStructureFiles />` | The monorepo tree on `contributing/architecture.mdx`. Do not hand-write the tree |
| `<ApiErrorsIndex />` | The grouped error-code list on `api/errors/index.mdx`. It reads the error pages |
| `<ChangelogIndex />` | The version list on `changelog/index.mdx`. It reads `docs/changelog/meta.json` |
| `<OpenAPIPage />` | An OpenAPI operation page. Generated content only |

## Example: app-linked concept page

This is the frontmatter shape of `docs/concepts/people.mdx`. The app links to this page, so it
carries a `docId`. A section that the app links to deep carries a `docSections` entry.

```yaml
---
title: "People"
icon: User
docId: concepts.people
docSections:
  adding-people: adding-people
description: People are the records at the center of Bondery. Learn which fields a person holds, how photos and social links work, and how to find them again.
---
```

The anchor for the section lives in the body, under the heading:

```mdx
## Adding people

<a id="adding-people" />
```

MDX does not support the `{#anchor}` shorthand. `check:docs:links` looks for the `id="..."` form.

## Reference checklist

- [ ] `title` set, and it matches the sidebar entry
- [ ] `description` is one line of 140-160 characters
- [ ] `icon` set where the authoring guide requires one
- [ ] `docId` added only when the app links to the page, then `pnpm run generate:doc-links`
- [ ] `docSections` anchors exist in the body as `<a id="..." />`
- [ ] The nearest `meta.json` lists the page
