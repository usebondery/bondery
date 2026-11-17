---
name: bondery-verification-loop
description: >
  Risk-proportional verification for Bondery monorepo changes. Maps changed files to
  npm workspaces and shared-package consumers, runs the fastest relevant lint, type,
  policy, test, contract, build, and runtime checks, then reviews staged and unstaged
  diffs without requiring commits. Use after implementing or refactoring, before handoff
  or a PR, when asked to verify/test/check changes, or when deciding which Bondery
  quality gates apply.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Verification Loop

## When to use

- After implementing a feature, bug fix, or refactor
- Before handoff, PR, or marking a Plane task done
- When the user asks to verify, test, validate, or check work
- When unsure which `pnpm run` gates apply to the current diff

## When not to use

- Architecture-only planning — write `→ verify:` steps instead (see `references/risk-and-reporting.md`)
- Deep security review — use `bondery-security`
- Legal/subprocessor reconciliation — use `bondery-legal`
- Post-push CI triage — use Cursor `babysit` skill
- Dependency upgrade matrices — use `.agents/workflows/chores/UPGRADE-PACKAGES.md`

## Non-negotiables

1. **Define success criteria first** — each item maps to a command or explicit manual check (`bondery-core` AGENTS.md §4).
2. **Scope to the diff** — inspect changed, staged, and untracked files; never assume `HEAD~1`.
3. **Fast checks first** — non-mutating Biome on changed files before full-repo gates.
4. **Risk expands scope** — shared packages, auth, migrations, and contracts pull in consumer checks.
5. **Loop until pass** — fix failures, re-run the failed gate, repeat.
6. **Report honestly** — list skipped checks, blockers, generated drift, and residual risk.
7. **Read-only by default** — do not stage, commit, or amend unless the user explicitly asked.
8. **Domain rules stay in owner skills** — complete linked checklists; do not duplicate them here.

## Workflow

1. **Scope** — `git status --short`, `git diff`, `git diff --cached` (or session edits if Git unavailable).
2. **Classify risk** — low / standard / high (see `references/risk-and-reporting.md`).
3. **Fast path** — `git diff --check`; `pnpm exec biome check --no-errors-on-unmatched --files-ignore-unknown=true <files>`.
4. **Workspace gates** — `check:types` and targeted `test:*` for every touched app/package.
5. **Boundary gates** — contracts, OpenAPI, i18n, security, migrations, mobile sync, builds — only when those boundaries changed.
6. **Review** — re-run failures; inspect generated artifacts; produce the report format in `references/risk-and-reporting.md`.

Use event-driven checkpoints (after a coherent unit of work, before handoff) — not a fixed time interval.

## Decision tree

| Task | Read |
|------|------|
| Success criteria, risk tiers, report format | [references/risk-and-reporting.md](references/risk-and-reporting.md) |
| Path → workspace → commands | [references/change-to-checks.md](references/change-to-checks.md) |
| CI parity, tiers, prerequisites, gaps | [references/ci-parity.md](references/ci-parity.md) |
| API contract checklist | [../../bondery-api/SKILL.md](../../bondery-api/SKILL.md) |
| Security commands | [../../bondery-security/SKILL.md](../../bondery-security/SKILL.md) § Verification commands |
| E2E / Playwright | [../../bondery-e2e-tests/SKILL.md](../../bondery-e2e-tests/SKILL.md) |
| Monorepo boundaries | [../../bondery-core/SKILL.md](../../bondery-core/SKILL.md) |
| UX / i18n display | [../../bondery-ux/SKILL.md](../../bondery-ux/SKILL.md) |

Full index: [references/README.md](references/README.md).

## Gotchas

- **Do not use** root `pnpm run lint` for verification — it runs `biome check --write .` and mutates files.
- **Do not use** `git diff HEAD~1` as the sole scope — misses unstaged work and assumes a commit.
- **`check:schemas-imports`** is referenced by webapp `check:types` but the npm script may be missing — see `references/ci-parity.md`.
- **Generators mutate** — `generate:openapi`, translation codegen, and `env --check` can dirty the tree; review diffs after running.
- **CI ≠ complete** — Playwright E2E, mobile sync lint, extension pattern checks, and `@bondery/helpers` unit tests are not in `verify.yml`.

## Verification loop checklist (before handoff)

- [ ] Success criteria written; each item has a verify command or manual check
- [ ] Changed files mapped to workspaces and risk tier recorded
- [ ] Non-mutating Biome passed on changed files (or full `biome ci .` for PR parity)
- [ ] `check:types` passed for every touched workspace (and consumers when shared packages changed)
- [ ] Boundary gates run for change type (OpenAPI, i18n, contracts, security, migrations, sync, build)
- [ ] Failed commands fixed and re-run until green
- [ ] Skipped checks documented with reason (missing DB, Docker, secrets, scope)
- [ ] Generated-artifact drift reviewed if any generator ran
- [ ] Applicable domain skill checklists completed (api, ux, security, legal, e2e)
- [ ] Report delivered with verdict: `PASS`, `FAIL`, `BLOCKED`, or `PASS_WITH_SKIPS`
