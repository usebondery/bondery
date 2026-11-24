# Migrations and connections

Bondery uses **classic Prisma migrate** (`prisma migrate dev` / `deploy`), not Prisma Next (`migration plan`, `db update`). For upstream Prisma Next migration skills and a concept map, see [prisma-skills.md](./prisma-skills.md).

## Migration workflow

Package scripts live in `packages/db/package.json`; run them from the repo root via root aliases (`pnpm run db:*`, `pnpm run release-migrate`).

| Command                      | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `pnpm run db:generate`       | Generate Prisma client                 |
| `pnpm run db:validate`       | Validate merged multi-file schema      |
| `pnpm run db:migrate:dev`    | Create/apply development migration     |
| `pnpm run db:migrate:deploy` | Apply committed Prisma migrations      |
| `pnpm run db:functions`      | Apply idempotent SQL functions/indexes |
| `pnpm run release-migrate`   | Production/CI migration gate           |
| `pnpm run db:studio`         | Inspect local data                     |

Release order is mandatory:

```text
prisma migrate deploy → apply functions.sql → backfill default_phone_country (null rows only) → provision OAuth clients → provision platform admins
```

Compose `api` `pre_start`, CI (`pnpm run release-migrate`), and host-run `pnpm run dev` (development) use this pipeline. `docker compose up` alone does not migrate unless `api` is recreated and `pre_start` runs.

## Migration rules

- Never modify a migration that has been applied outside your disposable local database
- Add a new forward migration to correct historical schema
- Review generated SQL before applying it
- Keep data backfills explicit and restartable
- For destructive changes, use expand → migrate data → contract
- Do not call external services from migration scripts or inside DB transactions
- Keep `functions.sql` idempotent (`create or replace`, `create index if not exists`) where appropriate

## Prisma client lifecycle

Canonical singleton: `packages/db/src/client.ts`.

It stores the development client on `globalThis` to avoid exhausting connections during `tsx watch` reloads. Application modules import from `@bondery/db`.

Do not instantiate:

```typescript
// Wrong in route/domain modules
const prisma = new PrismaClient();
```

Tests that require isolated clients must disconnect them explicitly and justify why the shared test client is insufficient.

## Connection configuration

### TLS (required)

Every connection to Postgres uses TLS that verifies the server (ADR 0029, `bondery-security` non-negotiable "Postgres requires verified TLS"). One resolver in `packages/db/src/connection/database-tls.ts` turns `DATABASE_SSL_MODE` (`verify-full` by default), `DATABASE_SSL_ROOT_CERT_FILE`, and `DATABASE_SSL_ROOT_CERT` into connection options:

```typescript
import { pgConnectionConfig } from "@bondery/db";

const pool = new Pool({ ...pgConnectionConfig(url), max: 10 }); // pg Pool or Client
const boss = new PgBoss({ ...pgConnectionConfig(url) }); // pg-boss
// prisma.config.ts: datasource.url = prismaCliUrl(url)
```

- Never put `ssl`, `sslmode`, or `rejectUnauthorized` on a connection by hand. `pg` applies URL parameters after explicit options, so the resolver strips TLS parameters from URLs.
- The Prisma CLI runs Prisma's native schema engine, which silently ignores libpq's `sslmode=verify-full`/`sslrootcert`. Only `prismaCliUrl` (Prisma's `sslaccept=strict` dialect, absolute `sslcert`) verifies it.
- `check:db-connections` (API `check:types`) fails on a connection that skips the resolver.
- Local dev Postgres is TLS-only too (`pnpm run start:postgres`, CA in `.temp/postgres-secrets`).

### Pooling and limits

Current state:

- One `DATABASE_URL`, TLS settings from `DATABASE_SSL_*`
- No PgBouncer configuration
- No explicit `connection_limit`, `pool_timeout`, or `statement_timeout`
- `pg-boss` shares the same database URL

This is a flagged capacity/operability gap, not proof of a current incident.

Use `supabase-postgres-best-practices` `conn-*` references for generic sizing, pooling modes, and timeout guidance. Choose values from measured API/worker concurrency and Postgres `max_connections`; do not copy generic numbers.

Account for:

- API Prisma pool per process
- Migration process
- pg-boss workers
- Admin/health checks
- Horizontal replicas
- Operational reserve

## Transaction boundaries

- Use interactive `$transaction` for atomic multi-step database state changes
- Keep it short and deterministic
- Never await Mapy, Anthropic, SMTP, Stripe, S3, or other network calls inside
- Prefer database constraints/upserts to read-then-write races
- For queues, follow upstream locking guidance (`FOR UPDATE SKIP LOCKED`) when implementing SQL workers; pg-boss already owns its queue mechanics

## Migration/connection checklist

- [ ] Migration created via Prisma workflow and generated SQL reviewed
- [ ] Applied historical migration not edited
- [ ] `functions.sql` changes remain idempotent
- [ ] Release ordering preserved
- [ ] Shared Prisma singleton used
- [ ] Any new Postgres connection spreads `pgConnectionConfig(url)` (Prisma CLI: `prismaCliUrl(url)`)
- [ ] Connection budget includes API, workers, replicas, and reserve
- [ ] Transaction contains no external network operation
- [ ] Backfill/destructive rollout is restartable and reversible where feasible
