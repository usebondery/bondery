# Bondery skill conventions

Project-specific rules for first-party skills in `.agents/skills/bondery-*`.

## Naming

| Rule | Example |
|------|---------|
| Directory = `name` frontmatter field | `bondery-api/` → `name: bondery-api` |
| Lowercase letters, numbers, hyphens only | `bondery-e2e-tests` ✅ `bondery_e2e` ❌ |
| `bondery-` prefix for first-party skills | `bondery-ux`, `bondery-core` |
| Upstream skills keep upstream name | `supabase-postgres-best-practices`, `prisma-next-*` |
| `metadata.namespace: bondery` on first-party skills | Required |

## Hub + references pattern

Every Bondery skill follows the same shape:

1. **SKILL.md** — thin hub (≤500 lines):
   - `When to use` — trigger phrases for agent discovery
   - `Non-negotiables` — hard rules, not tutorials
   - `Decision tree` — table linking to `references/` one hop away
   - **Pre-ship checklist** — mandatory section at the end
2. **references/README.md** — index table of all reference files
3. **references/*.md** — progressive disclosure; each ends with a focused checklist when multi-step gates apply

Canonical example: `.agents/skills/bondery-api/SKILL.md`.

## Cross-skill linking

Use repo-relative paths between skills:

```markdown
See [api-errors.md](../../bondery-api/references/api-errors.md)
```

Do not duplicate content across skills — link and keep a single source of truth:

| Domain | Owner skill |
|--------|-------------|
| Cross-cutting code craft, TypeScript, Biome | `bondery-coding-standards` |
| API contracts, Fastify, sync | `bondery-api` |
| UI, i18n, error display | `bondery-ux` |
| Monorepo boundaries, extension schema | `bondery-core` |
| Prisma schema, migrations, Postgres usage (Bondery classic Prisma) | `bondery-database` |
| Prisma Next (upstream CLI skills; routed from `bondery-database`) | `prisma-next-*` in `.agents/skills/` |
| E2E / Playwright | `bondery-e2e-tests` |
| Security, auth, tenant isolation | `bondery-security` |
| Legal disclosure, subprocessors, policy claims | `bondery-legal` |
| Product changelog, commit prefixes, release notes | `bondery-changelog` |
| Public roadmap, Plane ROADMAP project | `bondery-roadmap` |
| Internal MAIN board, cycles, sanity checks | `bondery-pm` |
| Release operator runbook (deploy, tags, pins, gates) | `bondery-release` |
| Skill authoring | `bondery-skill-authoring` |
| Verification loop, PR gates, change-scoped checks | `bondery-verification-loop` |
| Transactional email, templates, SMTP/Plunk | `bondery-emails` |
| 1:1 GitHub/email/review replies (founder voice) | `bondery-support-replies` |
| Chrome extension runtime, WXT/MV3, CWS listing graphics | `bondery-chrome-extension` |

## Agent configuration

If a skill should be read by default for implementation or architecture work, add it to:

- `.cursor/agents/implementer.md` — Step 0 read list
- `.cursor/agents/architect.md` — Step 0 read list

Not every skill belongs in both — only skills that apply broadly.

## Upstream vs first-party

| | First-party (`bondery-*`) | Upstream CLI |
|--|---------------------------|--------------|
| Edit in repo | Yes | No — reinstall via `pnx skills add` |
| Lock file | No | Yes — `skills-lock.json` |
| Checklist in SKILL.md | Required | Optional (upstream may not have one) |

Install upstream skills:

```bash
pnx skills add <owner>/<repo> --skill <skill-name>
```

Commit the updated `skills-lock.json` and `.agents/skills/<name>/` together.

## Bondery conventions checklist

- [ ] Skill name matches directory; `metadata.namespace: bondery`
- [ ] SKILL.md has When to use, Non-negotiables, Decision tree, Pre-ship checklist
- [ ] No duplicated content — cross-link to owner skill instead
- [ ] Agent configs updated if skill is broadly applicable
- [ ] Upstream skills installed via CLI, not hand-copied
