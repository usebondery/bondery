# Skill creation best practices

Source: https://agentskills.io/skill-creation/best-practices

## Start from real expertise

Skills should capture **project-specific** knowledge the agent would get wrong without them:

- Actual file paths, commands, and conventions from this repo
- Gotchas that defy reasonable assumptions
- Corrections from real agent mistakes

Avoid generic advice ("handle errors appropriately", "follow REST best practices") unless grounded in Bondery code.

## Context budget

Every token in SKILL.md competes with conversation history and other skills.

**Add:** what the agent lacks — Bondery paths, CI commands, non-obvious edge cases.

**Omit:** what the agent already knows — what HTTP is, what Playwright is, basic SQL syntax.

## Coherent scope

One skill = one coherent unit of work:

- `bondery-api` — API contracts and Fastify routes
- `bondery-ux` — UI patterns and i18n
- `bondery-e2e-tests` — test pyramid and Playwright

Too narrow forces multiple skills per task. Too broad makes activation imprecise.

## Calibrate control

| Fragility | Style |
|-----------|-------|
| Flexible (code review lens) | Principles + why |
| Fragile (migration order, auth flow) | Exact steps and commands |

**Defaults, not menus:** pick one approach; mention alternatives briefly.

**Procedures over declarations:** teach how to approach a class of problems, not one fixed answer.

## Patterns

### Gotchas (high value)

Keep in SKILL.md or a reference linked with a clear trigger:

```markdown
## Gotchas

- Fastify mounts routes without `/api` — BFF adds `/api` via `toBffApiPath()`
- Paginated lists use `search`, not `q`
```

### Checklists

Every Bondery skill ends with a pre-ship checklist. Multi-step reference files may have their own shorter checklist.

### Validation loops

Instruct agents to verify before merge:

1. Make changes
2. Run validator (`pnpm run check-*`, `skills-ref validate`, checklist self-review)
3. Fix and repeat until pass

## Checklist

- [ ] Each section passes "would the agent get this wrong without it?"
- [ ] SKILL.md under 500 lines
- [ ] No equal-weight menu of 5+ tools when one default exists
