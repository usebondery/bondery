---
name: bondery-skill-authoring
description: >
  How to create, name, and structure Bondery agent skills per agentskills.io.
  Use when adding or updating skills in .agents/skills/, writing SKILL.md frontmatter,
  progressive disclosure, references/, scripts/, or pre-ship checklists for Bondery skills.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Skill Authoring

## When to use

- Creating a new skill in `.agents/skills/`
- Updating an existing Bondery or upstream skill layout
- Writing or reviewing `description` frontmatter for agent discovery
- Splitting a bloated SKILL.md into `references/`
- Adding a pre-ship checklist to a skill
- Installing upstream skills via `pnx skills add`, or refreshing locked skills via `npx skills update`, and updating `skills-lock.json`

## Non-negotiables

- `name` must match the directory name — lowercase letters, numbers, hyphens only
- `description` must state **what** the skill does and **when** to activate it (trigger keywords)
- Keep `SKILL.md` under **500 lines** — move details to `references/`
- Link every reference file **one hop** from SKILL.md with explicit "when to read" context
- Every Bondery first-party skill ends with a **pre-ship checklist** section
- First-party skills use `metadata.namespace: bondery`
- Do not fork upstream CLI skills — reinstall via `pnx skills add`, or refresh locked skills with `npx skills update`

## Skill types

| Type | Location | Naming | Lock file |
|------|----------|--------|-----------|
| Bondery first-party | `.agents/skills/bondery-{domain}/` | `bondery-api`, `bondery-ux`, etc. | No |
| Upstream CLI | `.agents/skills/{upstream-name}/` | Keep upstream name (e.g. `supabase-postgres-best-practices`) | Yes — `skills-lock.json` |

## Structure template

```
.agents/skills/bondery-example/
├── SKILL.md              # Hub: when to use, non-negotiables, decision tree, checklist
├── references/           # Progressive disclosure (one hop from SKILL.md)
│   ├── README.md         # Index table
│   └── topic.md
├── scripts/              # Optional: tested automation agents should run
└── assets/               # Optional: templates, static resources
```

Minimal frontmatter:

```yaml
---
name: bondery-example
description: >
  One sentence WHAT. Use when [trigger phrases].
metadata:
  version: "1.0.0"
  namespace: bondery
---
```

Canonical example: `bondery-api` — decision tree + merge checklist at end of SKILL.md.

## Decision tree

| Task | Read |
|------|------|
| agentskills.io field rules | [references/specification.md](references/specification.md) |
| Context budget, gotchas, defaults | [references/best-practices.md](references/best-practices.md) |
| Test and iterate on a skill | [references/evaluating-skills.md](references/evaluating-skills.md) |
| Bundle scripts in a skill | [references/scripts.md](references/scripts.md) |
| Bondery naming and checklist pattern | [references/bondery-conventions.md](references/bondery-conventions.md) |

Full index: [references/README.md](references/README.md).

External spec: https://agentskills.io/specification

## Skill authoring checklist (before merge)

- [ ] `name` matches directory name; lowercase letters, numbers, hyphens only
- [ ] `description` states WHAT + WHEN + trigger keywords (third person, ≤1024 chars)
- [ ] SKILL.md body ≤500 lines; details moved to `references/`
- [ ] Every `references/` file linked one hop from SKILL.md with "when to read" context
- [ ] Gotchas for non-obvious project facts (not generic REST/HTTP tutorials)
- [ ] **Pre-ship checklist** section at end of SKILL.md (every Bondery skill must have one)
- [ ] Reference files end with focused checklist where multi-step gates apply
- [ ] Cross-skill links use repo paths (`../../bondery-api/references/...`)
- [ ] Upstream CLI skills: install with `pnx skills add ...` or refresh locked skills with `npx skills update`; commit `skills-lock.json` — do not hand-edit upstream content
- [ ] Validate: `npx skills-ref validate .agents/skills/<name>` (if available)
- [ ] Cursor agent configs updated if skill should be read by default (`.cursor/agents/implementer.md`, `.cursor/agents/architect.md`)
