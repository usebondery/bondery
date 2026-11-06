# Descriptions

The `description` frontmatter field is the hardest working string in a docs page. It must stand
alone. A reader sees it before the body, in search results, and inside an AI assistant context.

## Where it renders

| Surface | Component | What the reader sees |
|---------|-----------|----------------------|
| Lead paragraph under the H1 | `DocsPage.tsx` in `apps/website/src/components/docs/` | Dimmed introductory sentence above the table of contents |
| Folder index tiles | `DocsFolderIndex.tsx` | Tile text for each child of a folder with no `index.mdx` |
| Meta and OpenGraph | `docs/[[...slug]]/page.tsx` | `<meta name="description">` and the search snippet |
| `llms.txt` lines | `renderDescription` in fumadocs-core `source/llms.js` | The one-line summary under each page title |
| Markdown page body | `get-llm-text.ts` | The paragraph before the processed body |

Five surfaces read the same string. None of them shows the page title next to a full paragraph,
so the sentence cannot lean on context that only the body supplies.

## The gate

`pnpm run check:docs:descriptions` reads the first frontmatter block of every in-scope page.

| Rule | Value |
|------|-------|
| Pass band | 140-160 characters |
| Warning band | 120-139 characters prints a non-fatal warning and does not fail the check |
| Hard maximum | 160 characters |
| Failure | Under 120 characters, over 160 characters, a missing key, or a multi-line value |
| Measured value | The trimmed string, with surrounding quotes removed |
| Out of scope | `docs/adr/**`, `docs/api/api-reference/_generated/**`, `docs/changelog/unreleased.mdx` |

A value under 120 or over 160 fails the check. A value in the 120-139 band still renders, so the
check only warns, and the exit code stays 0. Run `check:docs:descriptions:strict` to treat that
band as a failure.

Release pages under `docs/changelog/` are in scope, with three extra rules:

| Rule | Why |
|------|-----|
| The text contains the version from the file name | The page title is a bare `1.11.0`, so a snippet needs the number |
| The text contains `Bondery` | The title gives no product name |
| The text has no category count such as `25 new features` | A count describes any release and names none |

Write one sentence naming the two or three changes a reader would search for. See
[`bondery-changelog`](../../bondery-changelog/references/format.md#release-page-description) for the
full rule and worked examples.

Write a single line. A folded `>` or a block `|` scalar fails the check with
`must be a single-line description`, because the length then depends on YAML folding rules.
Do not wrap the value in quotes. Unquoted plain YAML is safest, but then the value must not
contain `: ` or ` #`.

## Intent model

Name the reader's job before you write. The job decides what the sentence must contain.

| Page class | Reader's job | The description must contain |
|------------|--------------|------------------------------|
| Task page | Do one thing now | The action and the object it acts on |
| Concept page | Understand a thing | What the thing is, plus why it matters |
| Reference page | Look up a fact | What list or contract the page holds |
| Integration page | Call the API | What you can call, and with which credential |
| Self-host page | Operate the stack | The operator task and its prerequisite |
| Troubleshooting page | Resolve a symptom | The symptom the page resolves |

## Formula

Use this shape unless the page class demands otherwise:

```
[what the page delivers] + [distinguishing qualifier] + [outcome or scope]
```

One sentence. End with a period. Keep it specific enough that a sibling page could not use it.

Worked examples. Each count below is the length of the final string.

1. `docs/concepts/tags.mdx` — 148 characters.

   > Tags are flat, colour-coded labels for what kind of person a contact is. Learn how tags differ from groups, and when each one is the right tool.

   Delivers the definition, then the qualifier (how tags differ), then the scope (when to use).

2. `docs/deploy/installation.mdx` — 144 characters.

   > Install Bondery on your own server with Docker Compose. Create the network, set the env file, then start the stack behind your own reverse proxy.

   Delivers the task, names the tool, then lists the three operator steps.

3. `docs/api/errors/contact_not_found.mdx` — 156 characters.

   > The contact id does not exist or is not visible to this caller. Confirm the id belongs to the authenticated account before you retry the call.

   Delivers the cause, then the integration action. No page title, no marketing.

## Front-load the search term

The first 40 characters are what a reader scans in `llms.txt` and in search results. Start with
the object noun.

| Weak opening | Strong opening |
|--------------|----------------|
| `This page explains how API keys work.` | `API keys let a script call Bondery…` |
| `Learn how to import contacts.` | `Bulk import contacts from a vCard…` |
| `A guide to self-hosting.` | `Server requirements for a self-hosted…` |
| `Everything you need to know about groups.` | `Groups collect people into shared contexts…` |
| `Bondery's reminder system sends email.` | `Reminders watch contact birthdays and…` |

The object noun is `Contacts`, `API keys`, `MCP servers`, `Groups`, `Reminders`. The reader who
scans a list of ten lines sees those words first, and picks the line that matches the question.

## Sibling differentiation

Two pages under the same folder must not start with the same three words. A tile grid of six
paragraphs that all open with `This page explains` gives the reader nothing to choose with.

Consider the two MCP pages. They answer different questions.

| Page | Current length | Current text |
|------|----------------|--------------|
| `docs/apps/mcp-server.mdx` | 153 | The Bondery MCP server is the interface AI assistants use to search your contacts, read their history, and log interactions on your behalf today. |
| `docs/bondery/mcp.mdx` | 134 | Connect Claude, Cursor, or another MCP client to your Bondery account. Copy the MCP URL from Settings, then approve the OAuth sign-in. |

The first page is a concept page. It answers "what is the MCP server and what can an assistant
do with it". The second page is a setup task. It answers "how do I connect a client". Both
sentences must say which one they are. Re-measure both after any rewrite.

## Banned words and patterns

| Banned | Why |
|--------|-----|
| `simply`, `just`, `easily` | Claims the task is easy and blames the reader when it is not |
| `etc.` | Hides the end of a list and adds no information |
| Exclamation marks | Docs are reference material, not announcements |
| Em dashes (`—`) | Forbidden in all Bondery text. Use a period, a colon, or a comma |
| Trailing `Learn more.` | Wastes the last characters on a phrase the reader already knows |
| The page title as the first words | Repeats the line above it in the sidebar and on the page |
| `In this page`, `This page covers` | Spends the strongest 40 characters on scaffolding |

## Error page formula

The 119 pages under `docs/api/errors/` follow one shape, because an integrator reads them while
debugging a failing call.

```
[what the code means or why it fired] + [what the integration must do]
```

Target shape for `contact_not_found`:

> The contact id does not exist or is not visible to this caller. Confirm the id belongs to the authenticated account before you retry the call.

Keep every page in 140-160 characters, and vary the wording by domain. The 119 pages must not
read as one template with a swapped noun. Group them by the vocabulary of the domain:

| Domain | Vocabulary to reuse |
|--------|---------------------|
| `account_*`, `user_*` | profile, avatar, account row |
| `api_key_*` | key, scope, revoke, `Settings → API keys` |
| `auth_*`, `service_auth_*`, `session_*` | session cookie, bearer token, step-up token |
| `billing_*`, `checkout_*`, `subscription*` | Checkout session, subscription row, Stripe |
| `chat_*` | assistant allowance, session, quota |
| `contact_*`, `merge_recommendation_*`, `important_date_*` | contact id, duplicate, record |
| `group_*`, `tag_*`, `relationship_*`, `interaction_*` | member list, label, participants |
| `import_*`, `export_*` | export ZIP, parse, commit |
| `extension_*` | extension build, profile handle |
| `sync_*`, `sqlite_*` | protocol version, local schema, push |
| `settings_*`, `onboarding_*` | settings row, follow-up state |
| `webhook_*`, `oauth_*`, `email_*` | secret, credentials, mail service |

Read `docs/api/errors/index.mdx` and a sibling page in the same domain before you write. The
page body already states the cause and the action. Lift the facts from the body, then compress.

## Before and after

Real pages, measured before this guide applied.

| Page | Before | Before length | After | After length |
|------|--------|---------------|-------|--------------|
| `docs/api/index.mdx` | Overview of the Bondery REST API for integrations and automation. | 65 | Start with the Bondery REST API. Find the base URL, the authentication model, the integration guides, and the generated route reference pages. | 146 |
| `docs/api/authentication.mdx` | Authenticate REST API requests with sessions or long-lived API keys. | 68 | Authenticate Bondery REST API calls with a session token or a long-lived API key, and learn which routes accept which credential type in each flow. | 147 |
| `docs/apps/mcp-server.mdx` | Let Claude, Cursor, and other AI assistants look up contacts, brief you before meetings, and log interactions in Bondery. | 121 | The Bondery MCP server is the interface AI assistants use to search your contacts, read their history, and log interactions on your behalf today. | 153 |
| `docs/bondery/mcp.mdx` | Copy your MCP URL from Settings and sign in with OAuth so Claude Desktop, Cursor, and other MCP clients can search contacts and manage CRM records. | 142 | Connect Claude, Cursor, or another MCP client to your Bondery account. Copy the MCP URL from Settings, then approve the OAuth sign-in. | 134 |

Check the two MCP rows together. The concept page now opens with the server, and the setup page
opens with the connection task. A reader can tell them apart from the tile grid alone.

## Verification loop

1. Read the page body. Note the object noun and the reader's job.
2. Write one sentence with the formula.
3. Count the characters. Target 140-160.
4. Run `node scripts/check/check-docs-descriptions.mjs`.
5. Fix the violation it names, then repeat from step 4 until the run prints `ok` with no warnings.

## Checklist

- [ ] One sentence, ending with a period, on one line
- [ ] 140-160 characters
- [ ] Starts with the object noun, not with `This page`, `Learn how to`, or the page title
- [ ] No two siblings in the folder start with the same three words
- [ ] No `simply`, `just`, `easily`, `etc.`, or exclamation mark
- [ ] No em dashes (`—`)
- [ ] Contains no `: ` and no ` #`, so plain YAML parses it
- [ ] Matches the page body, with no capability the page does not describe
- [ ] `node scripts/check/check-docs-descriptions.mjs` reports `ok` with no warnings
