---
name: bondery-coding-standards
description: >
  Bondery-wide coding standards for readable TypeScript, naming, structure,
  error handling, documentation, and Biome-enforced quality. Use when implementing,
  refactoring, reviewing code quality, choosing module boundaries, or preparing code
  for verification across any app or package.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Coding Standards

## When to use

- Implementing or refactoring code in any Bondery workspace
- Reviewing readability, naming, structure, or maintainability
- Deciding whether logic belongs locally or in a shared package
- Resolving formatting, lint, type-safety, or documentation expectations
- Preparing a change for verification or contributor handoff

## Non-negotiables

1. **Read before writing** — inspect the nearest equivalent code and relevant owner skill before choosing a pattern.
2. **Prefer the smallest complete solution** — no speculative abstractions, configurability, or adjacent cleanup.
3. **Keep changes surgical** — every changed line must trace to the requested outcome.
4. **Make types communicate intent** — use strict TypeScript; prefer `unknown` plus narrowing over `any`. Justify unavoidable `any` at the use site.
5. **Make behavior explicit** — use intention-revealing names, flat control flow, immutable updates by default, and errors that preserve useful context.
6. **Let tooling own style** — follow `biome.json`; do not spend review time debating formatter-owned choices.
7. **Do not add dependencies silently** — justify the need, maintenance risk, bundle/runtime cost, and why existing or native code is insufficient.
8. **Do not duplicate domain rules** — API, database, security, UX, and monorepo boundaries remain owned by their dedicated skills.

The behavioral baseline in [`bondery-core/AGENTS.md`](../bondery-core/AGENTS.md) remains authoritative for thinking before coding, simplicity, surgical changes, and goal-driven execution.

## Decision tree

| Task | Read |
|------|------|
| Readability, naming, functions, comments, code smells | [references/code-craft.md](references/code-craft.md) |
| TypeScript, Biome rules, imports, non-mutating checks | [references/typescript-and-tooling.md](references/typescript-and-tooling.md) |
| Package boundaries and shared-code placement | [`bondery-core`](../bondery-core/SKILL.md) |
| API routes, transport, errors, pagination, sync | [`bondery-api`](../bondery-api/SKILL.md) |
| Prisma, migrations, IDs, raw SQL | [`bondery-database`](../bondery-database/SKILL.md) |
| Auth, authorization, tenant isolation, secrets | [`bondery-security`](../bondery-security/SKILL.md) |
| UI, i18n, forms, empty/error/loading states | [`bondery-ux`](../bondery-ux/SKILL.md) |
| React and Next.js implementation details | [`vercel-react-best-practices`](../vercel-react-best-practices/SKILL.md) and [`next-best-practices`](../next-best-practices/SKILL.md) |
| Change-scoped checks before handoff | [`bondery-verification-loop`](../bondery-verification-loop/SKILL.md) |

Full local-reference index: [references/README.md](references/README.md).

## Coding standards checklist (before handoff)

- [ ] Existing nearby patterns and applicable owner skills were read first
- [ ] The change is the smallest complete solution; unrelated code was not reformatted or refactored
- [ ] Names reveal intent and control flow is easy to follow
- [ ] No unjustified `any`, unsafe assertion, direct prop/state mutation, swallowed error, or dead code
- [ ] Shared logic respects `@bondery/schemas` / `@bondery/helpers` boundaries
- [ ] Comments explain non-obvious reasons, not obvious syntax
- [ ] No dependency or environment-specific value was introduced without justification
- [ ] Non-mutating Biome and the applicable `bondery-verification-loop` checks pass
