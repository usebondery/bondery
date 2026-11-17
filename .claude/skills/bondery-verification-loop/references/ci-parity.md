# CI parity and verification tiers

Authoritative PR gate: [`.github/workflows/verify.yml`](../../../../.github/workflows/verify.yml).  
Workflow map: [`.github/workflows/README.md`](../../../../.github/workflows/README.md).

There is **no** root `pnpm run verify` — mirror CI by running the steps below or pushing and watching Actions.

## Tiers

| Tier | When | Typical commands |
|------|------|------------------|
| **0 — Pre-commit** | Automatic on commit | Lefthook: Biome write on staged files; OpenAPI regen if API/schema paths staged; env example regen if manifest / `scripts/env/**` staged |
| **1 — Fast local** | After each coherent edit | Changed-file `biome check`, workspace `check:types`, targeted `test:*` |
| **2 — PR parity** | Before opening PR | Full `verify.yml` command sequence (below) |
| **3 — Staging** | Matches `main` image builds | `stage-images.yml` (path-filtered Docker builds for api, webapp, website) |
| **4 — Smoke / release** | Tags, release branch | `release-*.yml` (smoke-gated), `deploy-website.yml`, `smoke-bondery-stack.yml` (manual). Operator sequencing: [`bondery-release`](../../bondery-release/SKILL.md). |

Tier 2 is the default "am I ready for PR?" target when risk is standard or high.

## `verify.yml` local mirror (ordered)

```bash
pnpm install --frozen-lockfile
pnpm exec biome ci .
pnpm run check:package-imports
pnpm run env:check
# Local `pnpm run check` also runs `pnpm run check:env` (per-app required vars).
# Do not add that to GitHub Actions — it needs .env.*.local / secrets.
pnpm run check:docs
pnpm run check:openapi
# Docker required:
cp deploy/bondery/.env.example deploy/bondery/.env
node deploy/bondery/scripts/check-compose.mjs
pnpm run test:webapp:runtime-config
pnpm run check:contracts
DATABASE_URL=postgresql://postgres:password@127.0.0.1:54322/bondery pnpm exec turbo build --filter=api
pnpm run check:types
pnpm run check:i18n
pnpm run check:api-errors
pnpm run test:api:sync
# When api/webapp/docker paths change — mirror path-filtered PR docker jobs:
docker build -f apps/api/Dockerfile . --secret id=turbo_token,env=TURBO_TOKEN
docker build -f apps/webapp/Dockerfile . --secret id=turbo_token,env=TURBO_TOKEN
```

`verify.yml` runs `env`, `openapi`, `schema-contracts`, and `translations` in parallel. The required check `contracts` fails when any of them fail. `api-docker-build`, `webapp-docker-build`, and `website-docker-build` start only after `lint`, `types`, and `contracts` succeed.

Path-filtered PR image jobs:

| Job | Trigger paths | Proves |
|-----|---------------|--------|
| `api-docker-build` | `apps/api/**`, `packages/**`, Docker/workspace roots | Production API image builds; `@bondery/db` resolves in image |
| `webapp-docker-build` | `apps/webapp/**`, `packages/**`, Docker/workspace roots | Production webapp image builds |
| `website-build` | `apps/website/**`, … | Website prune+build on runner (not `docker build`) |

## Staging workflow (not full verify)

**`stage-images.yml`** (on `main`, path-filtered per service):

- Builds and pushes Docker images (`:beta` + `:sha-<short>` for api/webapp; `:sha-<short>` for website)
- No duplicate host test gate — PR `verify.yml` is the sole host quality gate

## Optional local checks (not in CI)

| Check | Command |
|-------|---------|
| Playwright E2E | `pnpm --filter webapp run test:e2e` |
| Mobile sync lint | `pnpm --filter mobile run check-sync-patterns` |
| Mobile unit sync | `pnpm --filter mobile run test:sync` |
| Extension patterns | `pnpm --filter chrome-extension run check:extension-patterns` |
| Helpers unit tests | `pnpm --filter @bondery/helpers test` |
| Webapp SSR smoke | `pnpm --filter webapp run smoke-ssr` |
| Full monorepo build | `pnpm run build` |
| Expo doctor | `pnpm exec expo-doctor` in `apps/mobile` |

Document these as `SKIPPED` in PR parity reports unless the diff touches those areas — then run them and report results.

## Known repository gaps (do not treat as passing silently)

| Gap | Impact |
|-----|--------|
| Biome CI 2.5.0 vs local 2.5.3 | Rare formatter drift between local and Actions |
| `verify` omits API auth integration | `test:auth` local-only until repaired |
| `verify` omits `test:theme` / `test:sync` for webapp | Run locally when touching webapp UI/sync |
| Website PR has no `docker build` | Only api/webapp get image builds on PR; website uses runner prune+build |

## Checklist

- [ ] Stated which tier was targeted (1–4)
- [ ] PR parity list compared to `verify.yml` when claiming CI alignment
- [ ] Postgres/Docker blockers called out if DB or compose steps skipped
- [ ] Non-CI checks run when diff warrants (mobile, e2e, extension, helpers)
