---
description: Guide for humans and agents editing Bondery documentation
hidden: true
---

# How to write docs

This guide applies to everyone who writes or edits documentation in `docs/` — contributors, maintainers, and AI agents.

## Language

Write in **clear, concise, accurate** prose. No fluff.

| Do | Don't |
|---|---|
| State what something is and what it does | Pad with marketing language or filler |
| Use plain words; define terms once | Assume jargon without context |
| Prefer short sentences and active voice | Repeat the same idea in different words |
| Be precise about behavior and limits | Hand-wave with "simply", "just", or "easily" |

Docs are reference material, not blog posts. Every sentence should earn its place.

## Know your audience

Before you write, decide who will read the page:

| Audience | Typical goal | Where it lives |
|---|---|---|
| **Users** | Use Bondery day to day | `bondery/`, `concepts/` |
| **Developers** | Self-host, integrate, contribute | `contributing/`, `api/` |
| **Agents** | Answer questions or implement against the product | All of the above |

Lead with the reader's goal. A user page explains *what to do*; a contributor page explains *how the system works*.

## Structure

### Every page

1. **Title** — noun or short phrase (`People`, `Architecture`, `Local development setup`)
2. **Lead** — one or two sentences: what this is and why it matters
3. **Body** — sections with `##` headings; tables and lists where they reduce ambiguity
4. **Related links** — point to the next doc a reader likely needs

### Core concept pages (`docs/concepts/`)

- One concept per file
- Add a GitBook icon in frontmatter when the page appears in the sidebar (see existing pages)
- Cross-link related concepts at the bottom
- Do not duplicate full explanations — link instead

### Contributing pages

- Describe the *current* architecture and setup, not historical plans
- Link to source files or env examples when steps are non-obvious
- Keep commands copy-pasteable and tested

### API docs

- **Do not hand-write endpoint YAML.** The contract is compiled from Zod schemas on Fastify routes.
- Zod wire schemas live in `@bondery/schemas` and `@bondery/schemas/http`; routes compose them in `schema.body`, `schema.params`, and `schema.response`.
- When you change API routes or `@bondery/schemas`, the **pre-commit hook** regenerates `apps/api/openapi.yaml` automatically (via lint-staged).
- Run `npm run check-openapi` before release or to validate Redocly rules locally.
- GitBook embeds the generated spec from `apps/api/openapi.yaml` (see `docs/SUMMARY.md`).
- Prose in `api/` should explain auth, base URL, and integration patterns — not duplicate every field.
- See [API routes](contributing/api-routes.md) for the route schema checklist.

## Formatting conventions

- **GitBook frontmatter** — use `icon:` on sidebar pages; use `hidden: true` for internal/meta pages
- **File names** — lowercase, hyphenated (`getting-started.md`, `local-setup.md`)
- **SUMMARY.md** — update the table of contents whenever you add, move, or rename a page
- **Code blocks** — include the language tag; show real commands and env var names from the repo
- **Hints** — use GitBook `{% hint %}` blocks sparingly for warnings or non-obvious caveats

## Writing for agents

Agents read the same docs as humans. Optimize for retrieval, not cleverness:

- Use **descriptive headings** that match how people ask questions ("How to access it", "Prerequisites")
- Prefer **tables** for field lists, env vars, and comparisons
- Put **canonical terms** in bold on first use (`Myself`, `merge recommendation`)
- Link to the definitive page instead of copying long passages into multiple files

Good external examples: [Resend docs](https://resend.com/docs/introduction), [AgentMail docs](https://docs.agentmail.to/welcome).

## When you change the product

Update docs in the **same change** when behavior, architecture, or setup steps change. If you move a feature (e.g. Myself from user guides to core concepts), update:

1. The page content and location
2. `docs/SUMMARY.md`
3. In-app help links — add or update `docId` (and `docSections` for section anchors) in the page frontmatter, then run `npm run generate-doc-links`. Use `helpDoc="your.docId"` or `doc="your.docId"` in the webapp; never hardcode `HELP_DOCS_URL` paths.
4. Cross-links from related concept pages
5. [docs/changelog.md](changelog.md) for user-visible release notes

### In-app doc link frontmatter

Pages linked from the app need stable identifiers in YAML frontmatter:

```yaml
---
docId: concepts.people
docSections:           # optional; maps section docId suffix → anchor id
  enriching-contact: enriching-contact
---
```

- `docId` is permanent once shipped — app code references it, not file paths.
- `docPath` is auto-derived from the file location; override only when the GitBook slug differs.
- Section anchors must be explicit in markdown: `## Heading {#anchor-id}`.
- Run `npm run generate-doc-links` after changing frontmatter; CI validates files and anchors.

## Checklist before opening a PR

- [ ] Audience and goal are obvious from the first paragraph
- [ ] No outdated stack names, ports, or data-flow claims
- [ ] `SUMMARY.md` reflects new or moved pages
- [ ] Related pages link to each other where useful
- [ ] Prose is concise — remove anything that does not inform or instruct
