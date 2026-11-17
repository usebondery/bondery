---
name: bondery-database
description: >
  Bondery Prisma and Postgres conventions — UUIDv7 IDs, schema design, migrations,
  raw SQL, PostGIS, pg_trgm, connections, transactions, and query patterns.
  Use when changing Prisma models, migrations, database functions, IDs, or query performance.
metadata:
  version: "1.1.0"
  namespace: bondery
---

# Bondery Database

## When to use

- Adding or changing Prisma models, relations, indexes, or migrations
- Generating primary keys or adding offline-first entities
- Writing `$queryRaw`, `$executeRaw`, or SQL functions
- Adding a Postgres extension or changing `prisma/sql/functions.sql`
- Touching PostGIS `gisPoint`, geocoding, or map queries
- Reviewing query performance, batching, or transaction boundaries
- Changing Prisma connection or migration deployment behavior

Use `supabase-postgres-best-practices` for generic Postgres performance theory. Use `bondery-security` for tenant authorization and the current no-RLS model. Use `bondery-core` for the canonical extension-schema rule.

**Stack:** Bondery runs **Prisma ORM 7** (classic multi-file Prisma schema + `@prisma/client`), not Prisma Next. Upstream `prisma-next-*` skills are installed for PN-specific work and evaluation — see [references/prisma-skills.md](references/prisma-skills.md). Do not substitute PN CLI commands or `db.orm` APIs for Bondery migrations and queries unless a dedicated PN adoption project is in scope.

## Non-negotiables (ranked)

1. **New primary keys use UUIDv7** — time-sortable and consistent with mobile's existing `uuidv7()` generation. Do not introduce new Prisma `@default(uuid())` (v4) IDs.
2. **Migrations use the package workflow** — create with `db:migrate:dev`; deploy with `release-migrate`. Never hand-edit an applied migration or the live database.
3. **Extensions live in `extensions`** — new `CREATE EXTENSION` statements use `WITH SCHEMA extensions` and references are schema-qualified. See `bondery-core`.
4. **Use the shared Prisma singleton** — import `prisma` from `@bondery/db`; never instantiate `new PrismaClient()` per request or feature module.
5. **PostGIS stays behind raw SQL helpers** — Prisma `Unsupported("geography(Point,4326)")` fields are not type-safe Prisma fields.
6. **Raw SQL is centralized and parameterized** — reusable RPCs belong in `packages/db/prisma/sql/functions.sql`; application calls use tagged `$queryRaw` / `$executeRaw`, never interpolated unsafe SQL.
7. **Batch writes** — prefer `createMany`, `createManyAndReturn`, `updateMany`, `updateManyAndReturn`, `deleteMany`, and `skipDuplicates` over per-row database loops. Use `*AndReturn` when you need inserted/updated rows back in one round trip.
8. **Transactions stay short** — never hold a transaction while calling geocoding, email, AI, storage, or another external service.
9. **Tenant queries remain user-scoped** — this skill owns database mechanics, not authorization. Follow `bondery-security` for `userId` scoping and no-RLS rules.

## Package map

| Concern | Path |
|---------|------|
| Prisma schema (entry) | `packages/db/prisma/schema.prisma` (generator + datasource) |
| Prisma models | `packages/db/prisma/models/*.prisma` |
| Prisma config | `packages/db/prisma.config.ts` (`schema: "prisma"`) |
| Prisma migrations | `packages/db/prisma/migrations/` |
| Extensions, indexes, functions | `packages/db/prisma/sql/functions.sql` |
| Shared Prisma client | `packages/db/src/client.ts` |
| SQL apply script | `packages/db/scripts/apply-sql-functions.ts` |
| Release migration gate | `packages/db/scripts/release-migrate.ts` |
| Mobile UUIDv7 generator | `apps/mobile/src/lib/sync/ids.ts` |
| API raw SQL wrappers | `apps/api/src/lib/data/`, `apps/api/src/services/` |

## Decision tree

| Task | Read |
|------|------|
| Prisma model, relation, type, index, naming, multi-file layout | [references/schema-conventions.md](references/schema-conventions.md) |
| New IDs or UUIDv7 rollout | [references/uuidv7-strategy.md](references/uuidv7-strategy.md) |
| Raw SQL, pg_trgm, PostGIS, functions | [references/raw-sql-and-postgis.md](references/raw-sql-and-postgis.md) |
| Migration or connection behavior | [references/migrations-and-connections.md](references/migrations-and-connections.md) |
| Selects, `omit`, batching, transactions, N+1 | [references/query-patterns.md](references/query-patterns.md) |
| Known schema drift and follow-ups | [references/schema-drift-and-gaps.md](references/schema-drift-and-gaps.md) |
| Prisma Next skills, PN vs classic Prisma, upstream routing | [references/prisma-skills.md](references/prisma-skills.md) |
| Prisma Next contract / migrations / queries (PN projects only) | `prisma-next-contract`, `prisma-next-migrations`, `prisma-next-queries` — via [references/prisma-skills.md](references/prisma-skills.md) |

Full index: [references/README.md](references/README.md).

## Verification commands

Run only what applies:

Run from the monorepo root (Prisma config and schema live in `packages/db/`, not the repo root):

```bash
# Regenerate Prisma client
pnpm run db:generate

# Validate merged multi-file schema
pnpm run db:validate

# Create and validate a local migration
pnpm run db:migrate:dev

# Apply idempotent SQL functions/indexes
pnpm run db:functions

# Verify release order: migrations → functions → OAuth clients
pnpm run release-migrate

# Typecheck the db package
pnpm run check:types -w @bondery/db

# API typecheck after query changes
pnpm run check:types -w api
```

Do not run bare `prisma` or `pnpm exec prisma` from the repo root — it will not find `prisma.config.ts` or `packages/db/prisma/`.

## Database checklist (before merge)

- [ ] Model added to the correct `prisma/models/*.prisma` file; `prisma.config.ts` still points at `schema: "prisma"`
- [ ] New entity ID uses UUIDv7; existing v4 IDs are not rewritten
- [ ] Prisma schema and generated migration agree on types, defaults, relations, and `ON DELETE`
- [ ] Foreign-key and common `WHERE` / `JOIN` columns have justified indexes
- [ ] New extension uses `WITH SCHEMA extensions`; calls are schema-qualified
- [ ] Reusable raw SQL lives in `functions.sql` and uses parameterized application calls
- [ ] No `$queryRawUnsafe` / `$executeRawUnsafe` string interpolation
- [ ] Writes are batched where possible; no avoidable per-row query loop
- [ ] Transactions contain database work only and remain short
- [ ] Tenant-owned queries satisfy the `bondery-security` user-scoping checklist
- [ ] `db:generate`, relevant migration/function command, and API checks pass
