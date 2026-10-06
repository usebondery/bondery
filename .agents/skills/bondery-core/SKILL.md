---
name: bondery-core
description: >
  Bondery monorepo architecture — package boundaries, Turborepo compiled packages,
  Postgres extensions schema, naming conventions, mobile local-first summary, and
  code review lens. Use when working across packages, database migrations, monorepo
  structure, or reviewing changes for architectural fit.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Core

## When to use

- Importing from or changing `@bondery/schemas`, `@bondery/helpers`, `@bondery/helpers/forms`
- Adding workspace package exports or Turborepo build config
- Writing Postgres migrations with extensions
- Naming props, functions, or modules
- Code review for architectural fit
- Understanding mobile local-first vs online-only data boundaries

For API routes, transport, and sync protocol, see the `bondery-api` skill. For UI patterns and i18n, see the `bondery-ux` skill. For transactional email (React Email templates, Plunk SMTP), see `bondery-emails`. For Prisma schema, migrations, and Bondery database conventions, see `bondery-database` (upstream `prisma-next-*` skills are routed from there for Prisma Next work only). For Postgres query performance and RLS, see `supabase-postgres-best-practices`. For E2E tests, see `bondery-e2e-tests`. For auth, tenant isolation, secrets, and security reviews, see `bondery-security`.

## Package boundaries

Monorepo shared packages follow a one-way dependency graph:

- `@bondery/schemas` — contract layer (types, Zod **validation** schemas, constants). Must not import any other `@bondery/*` package.
- `@bondery/helpers` — behavior layer (parsing, formatting, geocoding, routes). May depend on schemas.
- `@bondery/helpers/forms` — Zod pipelines that validate with schemas then normalize with helpers. Use on form submit/save.

| Need | Import from |
|------|-------------|
| Type or validation schema | `@bondery/schemas` |
| Utility / formatter | `@bondery/helpers` (subpath) |
| Form submit (validate + normalize) | `@bondery/helpers/forms` |

See `packages/schemas/README.md` and `packages/helpers/README.md`.

## Compiled workspace packages

Shared packages follow the [Turborepo compiled-package model](https://turborepo.dev/docs/guides/tools/typescript#compiled-packages):

- **TypeScript:** extend `@bondery/typescript-config` (`base.json` or `react-library.json`); `module` / `moduleResolution` = NodeNext.
- **Exports:** `types` → `src/`, `default` → `dist/`; run `pnpm run sync-exports` after adding public subpaths.
- **Internal imports:** `#*` hash paths with `.js` suffix (not `tsconfig` paths).
- **Build:** `rimraf dist && tsc` (+ rewrite hash imports); **compile:** incremental `tsc` then rewrite `#` imports in `dist`; **dev:** `tsc --watch` plus rewrite after each emit (`scripts/pkg/tsc-watch-and-rewrite.mjs`). Next.js cannot resolve `#` specifiers in compiled files. pnpm `injectWorkspacePackages` copies packages into app `node_modules`; rewrite also copies `dist` into those copies. `syncInjectedDepsAfterScripts` covers `build` and `compile` only.
- **Persistent app `#dev`:** orchestrate with `turbo run`, not `turbo watch`. Watch re-executes the task and kills `next dev` / `tsx watch` on any tracked write. Package incremental rebuilds come from `with` `tsc --watch` plus rewrite.
- **Apps:** consume `dist/` via exports — no `transpilePackages`, no `packages/*/src` aliases (mobile Metro resolves workspace packages from `src/` separately).

## Mobile local-first data

Tier-1 domain data (contacts, groups, tags, and child tables in `SYNC_TABLE_KEYS`) is **local-first on mobile**:

- **Reads:** `lib/sync/repositories/*` + `useSyncQuery` — never REST list/detail in `features/`.
- **Writes:** `submitSyncMutation` via `lib/domains/*` — optimistic SQLite + unified outbox; drainer pushes immediately when online.
- **Sync:** `PullManager` bootstraps and long-polls `GET /api/sync/pull`; materializers apply server rows into SQLite (server wins on pull).
- **Online-only:** `lib/api/online-only.ts` (settings, geocode, photos, share, vCard, account delete).

Run `pnpm run check-sync-patterns -w mobile` locally when touching mobile sync code. Full architecture: `bondery-api` skill → [sync-architecture.md](../bondery-api/references/sync-architecture.md).

## Code review

Read `bondery-coding-standards` for cross-cutting readability, naming, TypeScript, and Biome expectations.

When reviewing code, focus on:

1. **Code Quality** — apply `bondery-coding-standards`; keep this skill focused on architectural fit
2. **Functionality** — works as intended, meets requirements
3. **Performance** — bottlenecks, unnecessary re-renders, unoptimized queries
4. **Security** — vulnerabilities, input validation, tenant scoping (`userId` on Prisma queries). Read `bondery-security` skill — not RLS (API uses application-layer auth)
5. **Edge Cases** — unexpected inputs and failure modes
6. **Documentation** — non-obvious logic explained
7. **UX** — smooth, intuitive experience. Read `bondery-ux` skill — start with `references/common/`, then `mobile/`, `desktop/`, or `product/`

## Postgres extensions schema

Always install Postgres extensions in the `extensions` schema, never in `public`. Installing extensions in `public` is a security risk because objects in `public` are more broadly reachable.

**Rule:** Every `CREATE EXTENSION` statement in a migration must include `WITH SCHEMA extensions`.

```sql
-- ✅ correct
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ❌ wrong – omitting WITH SCHEMA defaults to public
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

When an extension lives in `extensions`, all references to its functions and operators must be schema-qualified as `extensions.<function>` (e.g., `extensions.unaccent(...)`, `extensions.gin_trgm_ops`, `extensions.word_similarity(...)`).

**Legacy migrations:** `pg_trgm` / `unaccent` were once created in `public` (`20260404100000`) and moved to `extensions` in `20260408100000_move_extensions_to_extensions_schema.sql`. `uuid-ossp` remains in `public` from the initial schema and is unused (tables use `gen_random_uuid()`). New installs should not repeat `CREATE EXTENSION` in `public`; remediate with `ALTER EXTENSION … SET SCHEMA extensions` or drop unused extensions.

For the current Prisma SQL apply workflow (`packages/db/prisma/sql/functions.sql`), PostGIS/pg_trgm usage, and known extension drift, read `bondery-database`.

## Naming conventions

### Props

Boolean props prefixed with `is` or `has` (e.g., `isActive`, `hasPermission`).

### Functions

- `get<FunctionName>` — retrieve data (e.g., `getUser`, `getContactList`)
- `set<FunctionName>` — modify data (e.g., `setUser`, `setContactList`)
- `is<FunctionName>` — boolean checks (e.g., `isUserActive`)
- `has<FunctionName>` — presence checks (e.g., `hasPermission`, `hasAccess`)

## Core checklist (before merge)

- [ ] Package boundary respected — schemas does not import helpers; helpers may import schemas
- [ ] New public package subpath has `sync-exports` run and `dist/` build verified
- [ ] Postgres extensions created with `WITH SCHEMA extensions`
- [ ] Extension function references schema-qualified as `extensions.*`
- [ ] No new dependencies without justification in plan or PR
- [ ] Mobile tier-1 changes respect sync patterns (`check-sync-patterns` locally)
- [ ] UX/i18n changes use `bondery-ux` skill — not inlined in this skill
- [ ] API contract changes use `bondery-api` skill — not inlined in this skill
- [ ] Security-sensitive changes use `bondery-security` skill — tenant scoping, auth, secrets
