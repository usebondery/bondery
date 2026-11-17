# Skill scripts

Source: https://agentskills.io/skill-creation/using-scripts

## When to bundle `scripts/`

Add a `scripts/` directory when the skill needs **repeatable, tested automation** that agents should run verbatim:

- Validation (`validate-skill.sh`, schema checks)
- Code generation with fixed templates
- Repo-specific setup steps with exact flags

Do **not** add scripts for one-off tasks, exploratory commands, or anything the agent can run with a single documented shell line.

## Requirements

- Scripts must be **idempotent** where possible — safe to re-run
- Document prerequisites in the script header comment and in SKILL.md
- Prefer Node or shell scripts already used in this monorepo (`node`, `bash`)
- Scripts run from repo root unless the skill documents a different `cwd`
- No secrets in scripts — read from env or `.env` files the developer already has

## Layout

```
.agents/skills/bondery-example/
├── SKILL.md
├── scripts/
│   └── check-example.mjs
└── references/
    └── scripts.md   # optional — only if usage is non-obvious
```

Reference scripts from SKILL.md with the exact invocation:

```bash
node .agents/skills/bondery-example/scripts/check-example.mjs
```

## Upstream CLI skills

Skills installed via `pnx skills add` may ship their own `scripts/`. Do not hand-edit upstream scripts — reinstall the skill instead. Track in `skills-lock.json`.

## Scripts checklist

- [ ] Script has a header comment: purpose, prerequisites, exit codes
- [ ] Invocation documented in SKILL.md (exact command)
- [ ] No hardcoded secrets or machine-specific paths
- [ ] Idempotent or documents side effects clearly
- [ ] Tested locally before merge
