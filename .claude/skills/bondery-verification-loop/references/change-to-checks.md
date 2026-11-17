# Change path → verification commands

Map changed paths to workspaces, then run the **minimum** command set for that change. Expand to consumer workspaces when shared packages change.

**Workspace flags:** use each workspace's `package.json` `name` — `-w api`, `-w webapp`, `-w mobile`, `-w website`, `-w chrome-extension`, `-w @bondery/db` (or root `db:*` / `release-migrate`), `-w @bondery/schemas` (or root `check:contracts`), `-w @bondery/translations` (or root `i18n:*` / `check:i18n*`). Prefer root scripts when they exist. Do not use directory paths like `-w apps/api`. Match `verify.yml` when in doubt.

## Fast path (almost always)

```bash
git diff --check
git status --short
pnpm exec biome check --no-errors-on-unmatched --files-ignore-unknown=true <changed-files>
```

For PR parity on format/lint across the repo:

```bash
pnpm exec biome ci .
```

## Root gates (run when path matches)

| Changed paths | Commands |
|---------------|----------|
| Any TS/JS across monorepo | `pnpm run check:types` (or scoped `-w` only if change is isolated) |
| Package import patterns | `pnpm run check:package-imports` |
| `packages/helpers/src/env/**`, `scripts/env/**`, `.env.example`, turbo env | `pnpm run env -- --check` |
| `scripts/updater/**` | `pnpm run update:aaguid-catalog` (run every file in that folder) |
| `docs/**` (non-website) | `pnpm run check-docs` |
| `apps/website/**` MDX/docs | `pnpm run check-docs` |
| `apps/api/**` routes/schemas, `packages/schemas/**` | `pnpm run check:openapi`, `pnpm run check:contracts` |
| `packages/translations/**`, locale JSON, UI strings | `pnpm run check:i18n` |
| API error catalog/docs | `pnpm run check:api-errors` |
| `deploy/bondery/**` | `docker compose -f deploy/bondery/docker-compose.yml config`, `node deploy/bondery/scripts/check-compose.mjs` |

## `packages/schemas` (`@bondery/schemas`)

| Trigger | Commands |
|---------|----------|
| Any change | `pnpm run check:contracts`, `pnpm run check:types -w @bondery/schemas` |
| Public export surface | `pnpm run sync-exports` (review diff), `pnpm run build -w @bondery/schemas` |
| Consumers | `pnpm run check:types -w api`, `pnpm run check:types -w webapp`, `pnpm run check:types -w mobile` as applicable |

## `packages/helpers` (`@bondery/helpers`)

| Trigger | Commands |
|---------|----------|
| Any change | `pnpm run check:types -w @bondery/helpers`, `npm test -w @bondery/helpers` |
| Env manifest | `pnpm run env -- --check` |

## `packages/db` (`@bondery/db`)

| Trigger | Commands |
|---------|----------|
| Prisma schema/migrations | `pnpm run check:types -w @bondery/db`, `pnpm run db:generate` |
| Release/CI parity | `pnpm run release-migrate` (requires Postgres — see `ci-parity.md`) |
| After migration | `pnpm run test:auth -w api` when auth behavior depends on schema |

## `packages/translations` (`@bondery/translations`)

| Trigger | Commands |
|---------|----------|
| Locale files | Full translation block from `verify.yml` (see root table above) |
| Manifest / codegen | `pnpm run build -w @bondery/translations`, `pnpm run check:i18n:types` |

## `apps/api` (`api`)

| Trigger | Commands |
|---------|----------|
| Any TS change | `pnpm run check:types -w api` |
| Routes/OpenAPI | `pnpm run check:openapi-spec -w api` or root `pnpm run check:openapi` |
| Sync/Redis | `pnpm run test:api:sync` |
| Auth/OAuth | `pnpm run test:auth -w api` (Postgres + migrate first) |
| Security-sensitive | `bondery-security` verification commands |

Policy scripts run inside `check:types` — see `apps/api/package.json`.

## `packages/emails` (`@bondery/emails`)

| Trigger | Commands |
|---------|----------|
| Template change | `pnpm --filter @bondery/emails run compile` and `pnpm --filter @bondery/emails run test` |
| Preview (manual) | `pnpm run dev:emails` |

When `apps/api/src/services/notifications/**` or `apps/api/src/lib/notifications/**` change, also run API typecheck. See [bondery-emails](../../bondery-emails/SKILL.md).

## `apps/webapp` (`webapp`)

| Trigger | Commands |
|---------|----------|
| Any TS/TSX | `pnpm run check:types -w webapp` |
| Theme | `pnpm run test:theme -w webapp` |
| Sync client | `pnpm run test:sync -w webapp` |
| Runtime config | `pnpm run test:runtime-config -w webapp` |
| Login/OAuth flows | `pnpm run test:e2e -w webapp` (local; see `bondery-e2e-tests`) |
| Production build confidence | `pnpm run build -w webapp`, optional `pnpm run smoke-ssr -w webapp` |

## `apps/website` (`website`)

| Trigger | Commands |
|---------|----------|
| Any change | `pnpm run check:types -w website` |
| MDX/docs content | `pnpm run check-docs` |
| Release build | `pnpm exec turbo build --filter=website^...`, `pnpm run build -w website` |

## `apps/mobile` (`mobile`)

| Trigger | Commands |
|---------|----------|
| Any TS/TSX | `pnpm run check:types -w mobile` |
| Tier-1 sync (`lib/sync`, `lib/domains`, repositories) | `pnpm run check-sync-patterns -w mobile` |
| Sync behavior | `pnpm run test:sync -w mobile` |
| Forms | `pnpm run audit:forms -w mobile` |
| Expo health (manual) | `pnpm exec expo-doctor` in `apps/mobile` |

Not in CI today — run locally when mobile changes.

## `apps/chrome-extension` (`chrome-extension`)

| Trigger | Commands |
|---------|----------|
| Any change | `pnpm run check:types -w chrome-extension` |
| Architecture/security patterns | `pnpm run check-extension-patterns -w chrome-extension` |
| Manifest/permissions/packaging | `pnpm run build -w chrome-extension` |

## Shared package consumers

When `packages/schemas`, `packages/helpers`, or `packages/translations` change, typecheck **downstream** workspaces that import them:

```bash
pnpm run check:types -w api
pnpm run check:types -w webapp
pnpm run check:types -w mobile
pnpm run check:types -w chrome-extension
pnpm run check:types -w website
```

Use Turbo filter when only one consumer is affected: `pnpm run check:types -- --filter=webapp...`

## Build commands (when output/bundle matters)

| Workspace | Command |
|-----------|---------|
| Full monorepo (high risk / release) | `pnpm run build` |
| API only | `pnpm run build:api` |
| Webapp only | `pnpm run build:webapp` |
| Website only | `pnpm run build:website` |
| Extension only | `pnpm run build:chrome-extension` |
| Shared packages | `pnpm run build:packages` or `pnpm run build -w @bondery/schemas` |

## Checklist

- [ ] Every touched workspace has `check:types` (or documented why not)
- [ ] Shared-package changes include consumer typechecks
- [ ] High-risk boundaries (OpenAPI, i18n, migrations, auth) have matching gates
- [ ] Mutating generators noted and diffs reviewed
