# Upstream Prisma skills

Bondery uses **Prisma ORM 7** (classic): multi-file schema under `packages/db/prisma/`, `@prisma/client`, `prisma migrate`, and the shared singleton in `packages/db/src/client.ts`. Day-to-day schema, migration, and query work is governed by this skill's Bondery-specific references — not by the upstream Prisma Next skills.

The upstream skills installed from `prisma/prisma-next/skills` document **Prisma Next** — a separate contract-first data layer (`contract.prisma`, `prisma-next` CLI, `db.orm` / `db.sql`). Do not apply Prisma Next commands or APIs to the Bondery codebase unless an explicit migration project is underway.

Reinstall or update upstream skills (do not hand-edit):

```bash
pnx skills add prisma/prisma-next/skills
```

Lock file: `skills-lock.json` at the repo root.

## When to load upstream skills

| Situation | Load |
|-----------|------|
| Schema change, migration, query in `@bondery/db` or API data layer | This skill's references (below) — **not** Prisma Next |
| Generic Postgres indexes, pooling, `EXPLAIN` | `supabase-postgres-best-practices` |
| Evaluating or prototyping Prisma Next adoption | `prisma-next` (router) → specific workflow skill |
| User asks "what is Prisma Next?" or PN vs Prisma 7 | `prisma-next` or `prisma-next-quickstart` |
| Brownfield PN setup from an existing database | `prisma-next-quickstart` (contract infer path) |
| Prisma Next contract / schema authoring | `prisma-next-contract` |
| Prisma Next migration authoring (`migration plan`, `db update`, data transforms) | `prisma-next-migrations` |
| Reviewing PN migrations before deploy / concurrent migration graphs | `prisma-next-migration-review` |
| Prisma Next query API (`db.orm`, `db.sql`, transactions) | `prisma-next-queries` |
| Prisma Next + Supabase RLS / role binding | `prisma-next-supabase` (Bondery uses application-layer auth, not RLS — read for PN+Supabase only) |
| `db.ts`, middleware, pools, script teardown in a PN project | `prisma-next-runtime` |
| Vite / Next.js PN build plugins | `prisma-next-build` |
| PN structured errors (`PN-*`, `MIGRATION.*`) | `prisma-next-debug` |
| Bug reports or feature requests to Prisma Next | `prisma-next-feedback` |

## Bondery stack ↔ upstream concept map

Use this when reading Prisma Next docs for ideas; implement with classic Prisma unless a PN migration is approved.

| Bondery (classic Prisma 7) | Prisma Next analogue | Bondery reference |
|----------------------------|----------------------|-------------------|
| `packages/db/prisma/` (multi-file) | `contract.prisma` / contract builder | [schema-conventions.md](./schema-conventions.md) |
| `pnpm run db:migrate:dev` | `migration plan` + `migrate` (or dev `db update`) | [migrations-and-connections.md](./migrations-and-connections.md) |
| `pnpm run release-migrate` | `migrate` + `db verify` in deploy pipeline | [migrations-and-connections.md](./migrations-and-connections.md) |
| `prisma` from `@bondery/db` | `db` from `src/prisma/db.ts` | [migrations-and-connections.md](./migrations-and-connections.md) |
| `findMany` / `createMany` / `$transaction` | `db.orm` / `db.sql` / `db.transaction` | [query-patterns.md](./query-patterns.md) |
| `packages/db/prisma/sql/functions.sql` | Extension ops + `rawSql` in `migration.ts` | [raw-sql-and-postgis.md](./raw-sql-and-postgis.md) |
| UUIDv7 via client extension | Contract-level ID defaults | [uuidv7-strategy.md](./uuidv7-strategy.md) |

## Installed upstream skills (paths)

| Skill | Path | Summary |
|-------|------|---------|
| `prisma-next` | [../../prisma-next/SKILL.md](../../prisma-next/SKILL.md) | Router for vague Prisma Next prompts |
| `prisma-next-quickstart` | [../../prisma-next-quickstart/SKILL.md](../../prisma-next-quickstart/SKILL.md) | Greenfield / brownfield PN setup |
| `prisma-next-contract` | [../../prisma-next-contract/SKILL.md](../../prisma-next-contract/SKILL.md) | Contract / schema authoring |
| `prisma-next-migrations` | [../../prisma-next-migrations/SKILL.md](../../prisma-next-migrations/SKILL.md) | Migration authoring |
| `prisma-next-migration-review` | [../../prisma-next-migration-review/SKILL.md](../../prisma-next-migration-review/SKILL.md) | Pre-deploy migration review |
| `prisma-next-queries` | [../../prisma-next-queries/SKILL.md](../../prisma-next-queries/SKILL.md) | Query lanes (ORM / SQL builder) |
| `prisma-next-runtime` | [../../prisma-next-runtime/SKILL.md](../../prisma-next-runtime/SKILL.md) | `db.ts`, middleware, connections |
| `prisma-next-build` | [../../prisma-next-build/SKILL.md](../../prisma-next-build/SKILL.md) | Build-tool integration |
| `prisma-next-supabase` | [../../prisma-next-supabase/SKILL.md](../../prisma-next-supabase/SKILL.md) | Supabase RLS and role binding |
| `prisma-next-debug` | [../../prisma-next-debug/SKILL.md](../../prisma-next-debug/SKILL.md) | PN error envelopes and drift |
| `prisma-next-feedback` | [../../prisma-next-feedback/SKILL.md](../../prisma-next-feedback/SKILL.md) | Bugs and feature requests |

## Prisma skills checklist

- [ ] Confirmed the task targets Bondery classic Prisma (`schema.prisma`, `@bondery/db`) vs a Prisma Next experiment
- [ ] Bondery-specific rules (UUIDv7, `extensions` schema, `release-migrate`, tenant scoping) still applied when reading upstream guidance
- [ ] Upstream skills not edited in-repo; reinstall via `pnx skills add` when updating
- [ ] `skills-lock.json` committed when upstream Prisma skills change
