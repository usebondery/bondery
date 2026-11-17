# Risk classification and reporting

## Success criteria (before coding)

Transform the task into verifiable checks. Format from `bondery-core` AGENTS.md:

```
1. [Step] → verify: [command or manual check]
2. [Step] → verify: [command or manual check]
```

Examples:

| Task | Success criteria |
|------|----------------|
| Add validation | Unit test for invalid input passes → `npm test -w @bondery/helpers` (if helper changed) |
| Fix API bug | Repro test passes → targeted `test:sync` or optional `test:api` when DB-backed |
| New route | OpenAPI in sync → `pnpm run check:openapi` |
| Mobile sync change | Pattern lint clean → `pnpm run check-sync-patterns -w mobile` |

Architect plans should include `→ verify:` on each implementation task without running commands.

## Risk tiers

Risk determines **how far** verification expands beyond the touched workspace.

### Low

Docs-only, copy, isolated styling with no contract or shared-package impact.

**Minimum:** changed-file Biome; doc link checks if `docs/**` touched.

### Standard

Isolated logic in one app or package; no auth, schema, or export surface change.

**Minimum:** workspace `check:types` + targeted `test:*` for that workspace.

### High

Any of: `packages/schemas`, `packages/db` migrations, API routes/auth, tenant data, mobile tier-1 sync, env manifests, package `exports`, deploy compose, extension permissions.

**Minimum:** standard gates **plus** consumer workspace typechecks, contract/OpenAPI/i18n/security gates as applicable, and database-backed tests when API auth paths change.

## Event-driven checkpoints

Run verification:

- After completing a coherent unit of work (not every N minutes)
- Before marking a task done or opening a PR
- After fixing a failed gate (re-run only what failed, then the selected gate set)

## Failure and rerun policy

1. Stop at first failure in a tier only when later gates depend on it (e.g. skip `test:auth` if `release-migrate` failed).
2. Fix the root cause; do not weaken CI or skip required gates without documenting `SKIPPED` + reason.
3. Re-run the exact command that failed, then any gates that could have been invalidated.
4. If blocked (no Postgres, no Docker, missing secrets), report `BLOCKED` with what would unblock.

## Mutating vs read-only commands

| Read-only (preferred for verify) | Mutating (review diff after) |
|----------------------------------|------------------------------|
| `pnpm exec biome check <files>` | `pnpm run lint` (writes whole repo) |
| `biome ci .` | `pnpm run generate:openapi` |
| `pnpm run check:types` | `pnpm run env -- --check` (may regenerate examples) |
| `pnpm run test:*` | Translation `i18n:types` / build steps that emit files |

## Report format

Deliver in this order:

```text
SCOPE
- risk: low | standard | high
- workspaces: ...
- files summary (counts, not full list unless small)

SUCCESS CRITERIA
- [criterion] → [PASS/FAIL/SKIPPED]

CHECKS RUN
- [command] → PASS | FAIL | BLOCKED
  (one-line failure excerpt if FAIL)

SKIPPED
- [check] — reason

GENERATED DRIFT
- [files] — reviewed yes/no

DOMAIN CHECKLISTS
- bondery-api: complete | n/a
- bondery-security: complete | n/a
- (others as applicable)

VERDICT
PASS | FAIL | BLOCKED | PASS_WITH_SKIPS

RESIDUAL RISK
- what was not verified and why
```

Do not use `READY for PR` when checks were skipped or blocked.

## Checklist

- [ ] Risk tier stated and justified by changed paths
- [ ] Every success criterion has a corresponding check result
- [ ] Skipped and blocked checks listed explicitly
- [ ] Verdict matches results (no `PASS` if any required gate failed)
