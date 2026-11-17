# Messaging

How Bondery says what it does. Strategy lives in [positioning.md](./positioning.md); sentence craft lives in [`bondery-writing`](../../bondery-writing/SKILL.md).

---

## The claim

| Layer | Copy |
|-------|------|
| **Headline** | Everyone you know, in one place your AI can use |
| **Subhead** | Bondery merges your contacts, keeps them in sync, and reminds you to stay in touch. |
| **Long form** (meta description, about, store listing) | Bondery brings together everyone you know. Merged, searchable, always in sync, and ready for your AI. |
| **Features title** | Everything you need to build stronger bonds |
| **Voice tagline** | A buddy for the relationships that matter |

The headline is the **UVP**. The voice tagline stays as the warm-friend brand line for tone and secondary placements (about page, emails). Do not stack both in the hero.

### Naming logic

| Copy | Reasoning |
|------|-----------|
| **Everything you need to build stronger bonds** | We are Bondery. We build the *bonds*, the edges between you and your network. Say the brand verb, not "stay close". |
| **All the people you met in one place** | Contacts come from every source you met people through across your life. We unify them. *Met* is history and sources; the hero's *know* is the present. |

Full reasoning: [positioning.md](./positioning.md#name-logic-why-bondery-says-bonds).

### Why this claim

- Says **what it is** (one place for everyone you know) and **what is new** (your AI can use it).
- Plain words, no category jargon. A founder gets it in one read.
- Same shape as the best claims in the category: what it collects, how it behaves, what you get.

### Alternates considered

| Option | Why not (yet) |
|--------|---------------|
| Build stronger bonds that grow your network | Vague. Could describe any networking tool. Previous hero. |
| The open-source address book for your network and your AI | Accurate, but "address book" undersells search and reminders. Good for the UVP sentence. |
| Your network, ready for your AI | Shorter, but drops "everyone you know", the concrete part. |

Test any new headline against: *Does it say what we collect? Does it say who uses it? Could a competitor say it?*

---

## Pillars

One line each. Ten words or fewer.

| Pillar | One-liner | Landing tile |
|--------|-----------|--------------|
| Centralize and merge | Every source you met people through, merged into one list. | All the people you met in one place |
| Remember | Notes and history on every person. | Remember every conversation |
| Proactive | Birthdays and anniversaries reach your inbox ahead of time. | Email reminders for key dates |
| AI context | Give Claude or any MCP client your contact book. | Your network, in your AI |
| Search | Search your network. See who is in a city before you go. | Find anyone |
| Stay current | Profiles refresh from the sources you saved them from. | Always up to date |

Claim limits are in [positioning.md](./positioning.md#five-things-bondery-does). Check them before adding a pillar.

---

## Sources and AI clients

There is no standalone "Works with" strip. The two lists live **inside the tiles** where they mean something.

### Sources (contacts in): inside "All the people you met in one place"

`features/SourcesVisual.tsx` shows each source flowing into a contact list.

- **Left, the sources:** real brand logos on neutral tiles, with connector lines.
- **Right, the contacts:** photo rows with the **same social buttons as the webapp contacts table**: small light-variant coloured squares with Tabler brand icons (LinkedIn blue, Instagram pink, phone blue, email red), not logos. Use `ThemeIcon`, not `ActionIcon`, because the tile is `aria-hidden`.
- **No Bondery logo and no title** inside the list card. The list does not need to introduce itself.

| Source | Status | Note |
|--------|--------|------|
| LinkedIn | Shipped | Chrome extension and import |
| Instagram | Shipped | Chrome extension and import |
| WhatsApp | **Coming soon** | Dimmed, with a "Soon" badge. Never present as available |
| vCard file | Shipped | Import |
| API | Shipped | REST API with API keys |

### AI clients (context out): inside "Your network, in your AI"

`features/AssistantVisual.tsx` is the chat. The clients are **real links**, in `features/AiClientLinks.tsx`, passed to the tile as `aside` so they sit outside the `aria-hidden` visual.

- **Mantine light-variant icon buttons with Tabler icons** (`ActionIconLink`), coloured like the webapp's social buttons. Tabler has a brand icon only for OpenAI. Claude (asterisk), MCP (plug), Hermes (feather), and OpenClaw (paw) use the closest glyph.
- **Icons only, no visible names.** Each link keeps an `aria-label` and a hover and focus `Tooltip`.
- **Vertical column** beside the chat on desktop, a row under it on phones.
- **No glow, ring, or highlight.** Hover is a subtle background or border change.

| Client | Status | Note |
|--------|--------|------|
| Claude | Shipped | Custom connector over MCP, documented in `docs/apps/mcp.mdx` |
| MCP | Shipped | `/mcp` on the API origin; the protocol itself |
| Hermes | Documented | Named as a headless MCP client in `docs/apps/mcp.mdx` |
| ChatGPT | **Not documented** | Shown as an MCP-compatible client. Add a docs section or soften the claim before launch |
| OpenClaw | **Not documented** | Same as ChatGPT |

| Link targets | |
|---|---|
| Claude | `https://claude.ai/customize/connectors` (the connector page). **The deep link is unverified**: signed out it redirects to sign-in, and so does a nonsense path. Fallback: `/docs/apps/mcp#claude` |
| MCP | `/docs/apps/mcp` |
| ChatGPT, Hermes, OpenClaw | `/docs/apps/mcp#other-clients` |

Do not name Cursor: the MCP docs say its tools do not run yet.

Update these tables **and** the visuals together. Drop the "Soon" flag only when the integration ships.

### Brand marks

- **Source:** [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) (`homarr-labs/dashboard-icons`). No CLI or MCP was installed when this was built, so files were fetched from the public CDN (`cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/<name>.svg`; MCP is `png/mcp.png`). The index is `metadata.json` in that repo.
- **Vet before adding:** download into an empty folder, grep for `<script`, `on*=`, `foreignObject`, and external `href`, and check the bytes really are an SVG (two "svg" files turned out to be PNG data).
- **Store:** `apps/website/public/images/brands/`, listed in `features/brand-icons.ts` (`BRAND_ICONS`).
- **Render on a neutral rounded tile.** Some marks are dark on transparent and vanish on a dark surface.
- **Only contact sources use logos** (LinkedIn, Instagram, WhatsApp, in `public/images/brands/`). The AI clients use Tabler icon buttons instead. Delete a logo file when nothing renders it.
- A mark only names a real integration. It is not an endorsement claim.

---

## Hooks by user group

Use the **hook** in ads, social, and section intros. The job-to-be-done detail is in [positioning.md](./positioning.md#user-groups).

| Group | Hook |
|-------|------|
| AI-native aggregators | Your AI finally knows who you know |
| Founders (weak ties) | Never lose a weak tie |
| Finance and business networkers | Every coffee chat, remembered |
| Thoughtful anyone | Never miss the dates that matter |

---

## Landing copy rules

Clean and simple. Short is the brand. If a section needs a paragraph, the design is wrong.

| Element | Limit |
|---------|-------|
| Section title | 5 words or fewer where possible, never a full sentence of clauses |
| Tile title | 5 words or fewer |
| Tile description | 10 words or fewer, one sentence |
| List (checks, bullets) | **3 items max**, 5 words or fewer each |
| Hero subhead | One sentence |
| Eyebrow badge | Only when it adds meaning. Default: none |
| Mock-up text | Real-looking, short. It illustrates; it never explains |
| Faces in mock-ups | **Real photos, never initials.** Use the shared cast (see below) |
| Privacy visual | One calm idea, no labels. Today: a single neutral padlock with the real Bondery app icon (the filled tile) as its emblem, shackle closing once on scroll-in. The bare node-link mark reads as a web at that size, so do not use it as the emblem. The left column carries the three points; the visual does not repeat them. No fake terminals, filenames, dates, or numbers |
| Pricing lists | 3 items on Free, 4 on Premium, one short line each, no per-feature descriptions |
| Pricing emphasis | No "Recommended" badge, no glow or halo. Premium is set apart by a **solid primary border and a primary "Get started" button**. Free keeps a neutral border and a quiet button |
| "Find anyone" visual | A dotted globe with photo pins, pre-computed in `features/globe-data.ts` (generated by `apps/website/scripts/generate-globe-dots.mjs` from Natural Earth). **Never a live map**: a map engine is slow to render and adds a dependency, a worker file, and a CSP origin |
| Glow | **None anywhere on the page.** No halo, pulsing ring, coloured shadow, or blur. A soft neutral hover lift on cards is fine |
| Timeline mock | Mirrors the webapp interactions timeline (Mantine `Timeline`, tinted emoji strip per interaction type, `PersonChip`s). Tints use `var(--mantine-color-<name>-light)` so they hold up in dark mode |
| Hero alignment | Text is centred below the `lg` breakpoint and left-aligned from `lg`, in step with the two-column grid. Use Tailwind `lg:` classes, not Mantine responsive props (Mantine's `lg` is 1200px, Tailwind's is 1024px) |

**Cut before you add.** When a block feels thin, add a visual, not a sentence.

**Avoid:** "platform", "seamless", "powerful", "leverage", "supercharge", "all-in-one", pipeline and lead language (see the non-negotiables in [SKILL.md](../SKILL.md)).

---

## Sample data (the cast)

Every mock-up uses the same people, so the page reads as one product. They match the hero screenshot and the repo's sample dataset (`packages/tests/sample-data/bondery`, Wikipedia portraits).

- **Where:** `apps/website/src/components/landing/features/sample-people.tsx` (`SAMPLE_PEOPLE`, `PersonAvatar`). Photos in `public/images/sample-people/`.
- **Photos, not initials.** An initials avatar reads as an empty state. A face reads as a real network.
- **Headlines verbatim** from the dataset. Do not invent a job for a real person.
- **Situational facts** (where you met, what you last discussed, a city) may be invented, but keep them harmless and plausible. Never invent anything negative.
- **Keep facts consistent across tiles.** If the chat logs "Coffee with Ada", the timeline shows the same coffee.
- To add a person, copy a portrait from the dataset's `export-files/avatars/` (file name = person id in `people.json`) and add an entry. Prefer public-domain portraits.

---

## Checklist

- [ ] Headline matches the claim table, or the table was updated first
- [ ] Every sentence passes the length limits above
- [ ] Lists have 3 items or fewer
- [ ] Every claim is shipped, or labelled "Soon"
- [ ] Source and AI-client tables match the two tile visuals
- [ ] Mock-ups use photos from the shared cast, no initials
- [ ] No glow anywhere; Premium is set apart by a solid primary border and CTA only
- [ ] Interactive elements (AI-client links) sit outside `aria-hidden` visuals
- [ ] Nothing on the landing page loads a map engine, tiles, or third-party assets at runtime
- [ ] Section titles keep the reasoning: *bonds* (brand verb), *met* (sources)
- [ ] Works for the three primary groups without alienating the secondary one
