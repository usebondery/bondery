# Positioning

Consolidated from brand questionnaire (2026), updated for the AI-context UVP. Update here when positioning shifts — then align website SEO copy (`apps/website/src/lib/seo/copy.ts`) and `packages/branding` taglines.

---

## Purpose

Help people build and maintain **real relationships** in a world that makes it easy to lose touch.

## Mission

Be a **proactive buddy** for your network — a simple, private, open-source PRM that remembers what matters and gently **suggests when to reach out**.

## North star (product job)

> Be a proactive buddy to build better relationships in your network.

Bondery is not primarily a database, analytics dashboard, or sales workflow. It helps people **show up** for relationships — with enough context to make reaching out feel natural.

**Proactivity level:** suggest action with context (e.g. "Maybe reach out to Alex — you met at the Prague meetup"). Not bare date reminders alone; not pushy guilt; not default full message drafts.

---

## Name logic: why Bondery says "bonds"

**Bondery** is built on _bond_. A relationship is an **edge** between you and a person in your network. Bondery's job is to create, record, and strengthen those edges.

- **Say the brand verb.** Copy about the product's purpose uses _bond_: "Everything you need to build stronger bonds".
- **The relationship graph is the product's shape**, not a feature: people are nodes, bonds are edges. That is why the graph, relationships, and keep-in-touch cadence exist.
- **"Met" versus "know".** _Know_ is the present. _Met_ is the history: contacts arrive from every source across your life (LinkedIn, Instagram, WhatsApp soon, files), and Bondery **unifies** them. The tile says "Everyone you **met** in one place" because consolidation is about where people came from.
- **Sources belong inside that tile.** LinkedIn, Instagram, WhatsApp, and files are not a separate "integrations" strip. They are the _sources_, shown flowing into one list, so the page explains consolidation instead of listing logos.

---

## Unique value proposition (UVP)

> Bondery is the open-source address book for your network and your AI. Every contact in one place, merged, searchable, in sync, and ready for Claude and other AI apps.

**Hero claim:** Build stronger bonds.
**Supporting claim (SEO titles, long form):** Everyone you know, in one place your AI can use.

The wedge: other contact tools store people. Bondery stores people **and makes that context usable** — by you (search, reminders) and by your AI (MCP, API).

### Five things Bondery does

| #   | Claim                                                            | Proof today                                                                                | Status                   |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------ |
| 1   | **Centralizes and consolidates** contacts, and merges duplicates | Chrome extension, imports (LinkedIn, Instagram, vCard, Bondery ZIP), merge recommendations | Shipped                  |
| 2   | **Searches intelligently**                                       | Contact search; plain-language Smart search is Premium                                     | Shipped                  |
| 3   | **Feeds your network to your AI** as context                     | MCP server, Claude connector, REST API                                                     | Shipped                  |
| 4   | **Stays up to date** through syncs                               | Imports and one-click LinkedIn re-sync from the extension                                  | Shipped (user-triggered) |
| 5   | **Proactive** — nudges you to keep in touch                      | Keep-in-touch cadence, email reminders for important dates                                 | Shipped                  |

**Claim guardrails:**

- Sync today is **re-enrichment you trigger** (extension) plus imports. Do not write "updates itself" or "automatic" without checking the docs first.
- Alerts about **changes in someone's life or job** are not shipped. Do not claim them.
- WhatsApp is **coming soon**. Always label it so.
- Cursor: the MCP docs say Cursor tools do not run yet. Name Claude and "any MCP client", not Cursor, in marketing.

---

## Category: PRM

| Rule                  | Detail                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| **Standard term**     | PRM (Personal Relationship Manager)                                     |
| **First touch**       | Spell out once: "PRM — a personal relationship manager" (or equivalent) |
| **After first touch** | "PRM" alone is fine                                                     |
| **Avoid as primary**  | "Personal CRM" on hero — acceptable as comparison ("not a sales CRM")   |

### Why PRM

- **Personal CRM** carries sales-tool baggage and confuses buyers.
- **Relationship tool** is vague and hard to own.
- **PRM** is accurate, ownable, and pairs with a one-line explainer.

---

## Competitive frame

| vs                | Message                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| **Spreadsheet**   | Structured, proactive, remembers for you — better than rows and columns |
| **Sales CRM**     | Simpler, personal, no pipeline theater — "not a sales tool"             |
| **Doing nothing** | Gentle nudges so relationships don't quietly fade                       |

Keep comparisons **plain** — no dunking on competitors by name in primary marketing.

---

## User research insights

Learned from talking to users. These are the frictions we heard, not opinions. Keep them as evidence for copy decisions, and date a new one when it arrives.

### 1. People already keep a manual contact list

What we heard:

- **Finance and business students** run many coffee chats. Some keep their own spreadsheet: who they met, when, their LinkedIn, and their company.
- **A one-person sales team** kept a simple spreadsheet for its agents.
- **Other people** write who they met, or follow-up reminders, in phone notes.

What it means: these people already pay the cost of a contact list. The problem is not that they do not track contacts. It is that a spreadsheet or phone notes is a poor place for a person.

**Proposition:** Your contacts deserve a better place than a spreadsheet or phone notes.

**Landing tile:** "Better than a spreadsheet". Show a spreadsheet with plain columns, then the same person in Bondery with a photo, a role, and history.

### 2. A CRM fails when it needs discipline

What we heard: a CRM or PRM is too manual. It relies on the user remembering to write things down, and most people stop.

What it means: the data must update from the tools people already use, not from a habit they must keep.

**How we cover it:** Bondery syncs from the integrations themselves, instead of asking for manually written data. Contacts arrive from LinkedIn and Instagram through the extension, and imports, and later refresh from the sources they came from.

**Claim guardrails:** sync today is user-triggered re-enrichment plus imports. Do not write "updates itself" or "automatic" until the docs say so. See the guardrails under the UVP in [positioning.md](./positioning.md#unique-value-proposition-uvp).

---

## User groups

Three primary groups, one secondary. Lead copy with the **job**, not the feature.

### 1. AI-native contact aggregators (agents and MCP)

- **Who:** People who run Claude or other AI agents and want them to know their network
- **Job to be done:** "Give my AI the context of everyone I know, so it can brief me, draft, and log."
- **Trigger:** Asking an assistant "who do I know at X?" and getting nothing
- **Hook:** Your AI finally knows who you know
- **Show:** MCP server, Claude connector, REST API, imports, merge

### 2. Founders who care about weak ties

- **Who:** Founders and operators whose next intro, hire, or investor is a loose connection
- **Job to be done:** "Keep weak ties warm so the right person is one message away."
- **Trigger:** Realizing a valuable contact went cold a year ago
- **Hook:** Never lose a weak tie
- **Show:** Keep in touch, one-click LinkedIn save, interaction history, search, relationship graph

### 3. Finance and business networkers (coffee chats)

- **Who:** Students and professionals in finance and business who run many coffee chats, for example through their school or alumni network
- **Job to be done:** "Remember who I met, what we discussed, and follow up on time."
- **Trigger:** Back-to-back coffee chats, then a follow-up that never got sent
- **Hook:** Every coffee chat, remembered
- **Show:** Interaction log and notes, groups and tags for cohorts, LinkedIn extension, keep in touch
- **Trust note:** This group is privacy-aware. Lead with EU hosting, open source, and self-hosting as proof.

### Secondary: the thoughtful anyone

- **Who:** Friends, family, colleagues, smaller circles
- **Job to be done:** Remember details and dates; reach out before too much time passes
- **Fear:** Apps that feel like work or surveillance

**Writing test:** Would this sentence make sense to a founder at a meetup _and_ someone tracking family birthdays? If not, simplify. The page is allowed to speak to the three primary groups first.

---

## What we are / are not

| We are              | We are not                                              |
| ------------------- | ------------------------------------------------------- |
| Open-source PRM     | Sales CRM, ATS, or marketing automation                 |
| Privacy-first       | Ad-supported or data-broker model                       |
| Proactive buddy     | Stalkerware, social score, or "engagement optimization" |
| Simple by design    | Feature-bloated "platform"                              |
| Sustainable company | Growth-at-all-costs startup                             |

---

## Open startup (internal brand pillar)

Transparency, build-in-public, and open-source alignment are **company values** that shape how we work. They are **not** the primary customer-facing hero message.

**Customer-facing:** privacy, simplicity, open source (as trust signal), roadmap/changelog honesty.

**Internal / community-facing:** metrics, decisions, learnings, contributor culture.

See [values.md](./values.md).
