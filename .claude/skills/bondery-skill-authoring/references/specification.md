# agentskills.io specification (summary)

Full spec: https://agentskills.io/specification

## Directory structure

```
skill-name/
├── SKILL.md          # Required
├── references/       # Optional — on-demand docs
├── scripts/          # Optional — executable helpers
└── assets/           # Optional — templates, static files
```

## Frontmatter fields

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Matches directory; `a-z`, `0-9`, `-` only; max 64 chars |
| `description` | Yes | WHAT + WHEN + keywords; max 1024 chars |
| `license` | No | Short license name |
| `compatibility` | No | Environment requirements |
| `metadata` | No | Arbitrary key-value (use `namespace: bondery` for Bondery skills) |
| `allowed-tools` | No | Experimental pre-approved tools |

## Progressive disclosure

1. **Metadata** (~100 tokens) — `name` + `description` loaded at startup for all skills
2. **SKILL.md body** (<5000 tokens recommended) — loaded when skill activates
3. **references/** — loaded only when the agent follows a link for the current task

Keep file references **one level deep** from SKILL.md. Avoid `SKILL.md → a.md → b.md` chains.

## Validation

```bash
npx skills-ref validate .agents/skills/<skill-name>
```

## Checklist

- [ ] `name` field matches parent directory exactly
- [ ] No uppercase, slashes, or consecutive hyphens in `name`
- [ ] `description` includes activation triggers, not just a title
