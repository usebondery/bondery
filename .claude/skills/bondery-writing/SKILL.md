---
name: bondery-writing
description: >
  Bondery English registers — Orwell-Hemingway for published user-facing copy
  (blog, landing, documentation, UI, changelog, emails) and ASD-STE100 / ASD-100
  technical English for agent replies, plans, summaries, comments, JSDoc, and
  tech docs. Use when writing or rewriting prose, copy, blog posts, landing pages,
  documentation, plans, summaries, PR text, or comments; or when the user names
  Orwell, Hemingway, ASD-100, ASD-STE100, Simplified Technical English, or
  technical English.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery writing

## When to use

- Writing or editing published English (blog, landing, marketing, product UI, changelog, emails, user docs)
- Writing agent replies, plans, summaries, PR descriptions, comments, JSDoc, ADRs, or tech docs
- The user names Orwell, Hemingway, ASD-100, ASD-STE100, Simplified Technical English, or technical English
- A draft mixes marketing voice with spec voice and needs one register

This skill owns **how English is built**. Domain skills still own **what Bondery says**.

## Non-negotiables

1. **One register per artifact.** Do not mix Orwell-Hemingway and ASD-100 in the same piece.
2. **Default this conversation to ASD-100** (see [AGENTS.md](AGENTS.md)). Switch only when the artifact is published user-facing English.
3. **Legal stays legal.** Privacy, Terms, and policy claims use `bondery-legal`. Do not restyle them.
4. **Keep literals literal.** Code identifiers, error codes, paths, env vars, and quoted user text stay exact.
5. **ASD-100 is an adaptation.** It applies ASD-STE100 writing-rule categories. It is not the official dictionary and is not certified STE.

## Decision tree

| Artifact | Register | Also read |
|----------|----------|-----------|
| Blog, landing, marketing, social, hero/taglines | [Orwell-Hemingway](references/orwell-hemingway.md) | [`bondery-brand`](../bondery-brand/SKILL.md) |
| Product UI strings | [Orwell-Hemingway](references/orwell-hemingway.md) | [`bondery-ux`](../bondery-ux/SKILL.md) → `ux-writing.md` + i18n |
| Changelog / user release notes | [Orwell-Hemingway](references/orwell-hemingway.md) | [`bondery-changelog`](../bondery-changelog/SKILL.md) |
| Transactional email body | [Orwell-Hemingway](references/orwell-hemingway.md) | [`bondery-emails`](../bondery-emails/SKILL.md) |
| User product docs (`docs/getting-started`, `apps/`, `bondery/`, `concepts/`) | [Orwell-Hemingway](references/orwell-hemingway.md) | [`docs/contributing/how-to-write-docs.mdx`](../../../docs/contributing/how-to-write-docs.mdx) |
| Agent chat, plans, summaries, PR text | [ASD-100](references/asd-100.md) | — |
| Comments, JSDoc, internal READMEs, ADRs | [ASD-100](references/asd-100.md) | [`bondery-coding-standards`](../bondery-coding-standards/SKILL.md) for *when* to comment |
| Tech docs (`docs/api/`, `deploy/`, `contributing/`) | [ASD-100](references/asd-100.md) | how-to-write-docs.mdx (structure only) |
| Legal / privacy claims | neither | [`bondery-legal`](../bondery-legal/SKILL.md) |

Full index: [references/README.md](references/README.md).

Always-on default rules live in [AGENTS.md](AGENTS.md). Read [asd-100.md](references/asd-100.md) for long technical artifacts. Read [orwell-hemingway.md](references/orwell-hemingway.md) before writing published user-facing copy.

## Writing checklist (before handoff)

- [ ] One register chosen from the decision tree
- [ ] User-facing copy used Orwell-Hemingway and the matching domain skill
- [ ] Agent replies, plans, comments, and tech docs used ASD-100
- [ ] Legal copy was not restyled
- [ ] Identifiers, error codes, paths, and quoted text stayed literal
- [ ] The two registers were not mixed in one artifact
