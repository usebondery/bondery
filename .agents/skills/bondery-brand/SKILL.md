---
name: bondery-brand
description: >
  Bondery brand identity — purpose, mission, unique value proposition (UVP), target
  user groups, positioning, headline and messaging, integrations list, values, voice,
  and PRM category language. Use when writing marketing copy, landing page or website
  content, hero headlines, taglines, blog posts, changelog tone, social posts, ads,
  choosing who the copy is for, or reviewing whether copy matches brand voice.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery brand

## When to use

- Writing or reviewing marketing copy (website, blog, social, ads)
- Choosing taglines, hero text, or category language (PRM vs personal CRM)
- Onboarding or in-product copy that should feel distinctly "Bondery"
- Changelog, incident comms, or company updates where tone matters
- Deciding whether "open startup" transparency belongs in customer-facing copy

For UI microcopy rules (buttons, errors, empty states, i18n), see `bondery-ux` — this skill owns **brand strategy and voice**; `bondery-ux` owns **product copy mechanics**. Sentence craft for published copy is Orwell-Hemingway in [`bondery-writing`](../bondery-writing/SKILL.md).

For 1:1 GitHub issue replies, support emails, and similar user messages, see [bondery-support-replies](../bondery-support-replies/SKILL.md).

For visual assets (logo, colors, OG images), see `packages/branding` (`@bondery/branding`).

## Brand at a glance

| Element | Statement |
|---------|-----------|
| **Purpose** | Help people build and maintain real relationships in a world that makes it easy to lose touch |
| **Mission** | Be a proactive buddy for your network — a simple, private PRM that remembers what matters and gently suggests when to reach out |
| **Category** | Open-source **PRM** (Personal Relationship Manager) |
| **UVP** | The open-source address book for your network and your AI: every contact merged, searchable, in sync, and ready for Claude and other AI apps |
| **Headline** | Everyone you know, in one place your AI can use |
| **Name logic** | Bondery builds **bonds**, the edges between you and your network. Features title: "Everything you need to build stronger bonds". Tile: "Everyone you **met** in one place" (sources unified) |
| **Primary user groups** | AI-native contact aggregators (agents, MCP) · Founders who care about weak ties · Finance and business networkers (coffee chats) |
| **Voice tagline** | A buddy for the relationships that matter |
| **Voice** | Warm friend — human, nudging, simple, no jargon or fluff |
| **Proactivity** | Suggest action with context — not just dates, not guilt-tripping |

## Non-negotiables

- **PRM** is the standard category label — explain it once where the category is named (SEO title, FAQ, about), then use PRM alone. The **hero leads with the UVP**, not the category
- **Landing copy is short** — tile titles ≤5 words, descriptions ≤10 words, lists ≤3 items. See [messaging.md](references/messaging.md#landing-copy-rules)
- **Say "bonds"**, the brand verb. Relationships are edges between you and people; Bondery strengthens them. See [positioning.md](references/positioning.md#name-logic-why-bondery-says-bonds)
- **Sources live inside the "Everyone you met in one place" tile**, flowing into one list. There is no separate "Works with" strip. AI clients live inside the "Your network, in your AI" tile
- **Mock-ups use real photos from the shared cast**, never initials. See [messaging.md](references/messaging.md#sample-data-the-cast)
- **Claims must be true today** — check the claim guardrails in [positioning.md](references/positioning.md#five-things-bondery-does). Mark unshipped integrations "Soon"
- **Not a sales CRM** — positioning against sales tools is valid; never sound like pipeline/lead-gen software
- **Warm friend voice** in public — honest and direct, but no internal-only edge (swearing, KISD shorthand) on the website or in product
- **Privacy and transparency are different promises** — company runs openly; user relationship data stays private (see [values.md](references/values.md))
- **Build in public** shapes how we work — it is **not** a homepage hero pillar
- **Simplicity is brand** — if copy needs jargon to sound credible, rewrite it
- UI microcopy still follows `bondery-ux` (sentence case, second person, `packages/translations`)

## Decision tree

| Task | Read |
|------|------|
| Purpose, mission, **UVP**, **user groups**, PRM intro, claim guardrails | [references/positioning.md](references/positioning.md) |
| Voice, tone, do/don't examples | [references/voice-and-tone.md](references/voice-and-tone.md) |
| Headline, taglines, pillars, **sources and AI clients**, brand marks, sample-data cast, landing copy limits | [references/messaging.md](references/messaging.md) |
| Values → product and comms behavior | [references/values.md](references/values.md) |

Full index: [references/README.md](references/README.md).

Related skills: [bondery-writing](../bondery-writing/SKILL.md) (Orwell-Hemingway sentence craft), [bondery-ux](../bondery-ux/SKILL.md) (UI copy), [bondery-support-replies](../bondery-support-replies/SKILL.md) (1:1 GitHub/email replies), [bondery-changelog](../bondery-changelog/SKILL.md) (release notes), [bondery-emails](../bondery-emails/SKILL.md) (transactional email), [bondery-legal](../bondery-legal/SKILL.md) (privacy claims).

## Brand checklist (before shipping copy)

- [ ] Copy matches **warm friend** voice — not salesy, not cold, not builder-peer unless explicitly a dev/contributor page
- [ ] Category uses **PRM**; explained where the category is named (SEO, FAQ, about)
- [ ] Headline and pillars match [messaging.md](references/messaging.md); copy stays within its length limits
- [ ] Every claim is shipped or labelled "Soon"; the source and AI-client tables in messaging.md match the tile visuals
- [ ] Section titles keep the reasoning (*bonds*, *met*); mock-ups use photos, not initials
- [ ] No sales-CRM language (pipeline, leads, conversion, quota)
- [ ] Proactive suggestions are **helpful with context** — not guilt or spam
- [ ] Privacy claims align with [bondery-legal](../bondery-legal/SKILL.md) — no overselling
- [ ] "Open startup" transparency only where appropriate (about, blog, changelog) — not forced into product UI
- [ ] Speaks to a named **user group** and its job to be done, and still works for the secondary audience (thoughtful anyone)
- [ ] Product UI strings still go through `packages/translations` per `bondery-ux`
